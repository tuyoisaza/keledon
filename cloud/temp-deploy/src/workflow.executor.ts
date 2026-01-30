import { Injectable } from '@nestjs/common';
import { Socket } from 'socket.io';
import { WorkflowStorage } from './workflow.storage';
import { TtsFactory } from './tts.factory';
import { ToolExecutor } from './tool.executor';
import {
    Workflow,
    WorkflowStep,
    WorkflowExecution,
    StepResult,
    ManagedInterface
} from './interfaces/workflow.interface';

@Injectable()
export class WorkflowExecutor {
    private activeExecutions = new Map<string, WorkflowExecution>();

    constructor(
        private readonly storage: WorkflowStorage,
        private readonly ttsFactory: TtsFactory,
        private readonly toolExecutor: ToolExecutor,
    ) { }

    async executeWorkflow(
        client: Socket,
        workflowId: string,
        sessionVariables: Record<string, string> = {}
    ): Promise<WorkflowExecution> {
        const workflow = this.storage.getWorkflow(workflowId);
        if (!workflow) {
            throw new Error(`Workflow ${workflowId} not found`);
        }

        const iface = this.storage.getInterface(workflow.interfaceId);

        const execution: WorkflowExecution = {
            id: `exec-${Date.now()}`,
            workflowId,
            sessionId: client.id,
            status: 'running',
            currentStepIndex: 0,
            variables: {
                ...workflow.variables,
                ...sessionVariables,
                'interface.baseUrl': iface?.baseUrl || '',
                'interface.name': iface?.name || '',
            },
            startedAt: new Date().toISOString(),
            stepResults: [],
        };

        this.activeExecutions.set(execution.id, execution);
        client.emit('workflow-started', { executionId: execution.id, workflowName: workflow.name });

        try {
            for (let i = 0; i < workflow.steps.length; i++) {
                execution.currentStepIndex = i;
                const step = workflow.steps[i];

                client.emit('workflow-step', {
                    executionId: execution.id,
                    stepIndex: i,
                    stepName: step.name || step.type,
                    status: 'running'
                });

                const result = await this.executeStep(client, step, execution.variables, iface);
                execution.stepResults.push(result);

                client.emit('workflow-step', {
                    executionId: execution.id,
                    stepIndex: i,
                    stepName: step.name || step.type,
                    status: result.status,
                    output: result.output
                });

                if (result.status === 'failed') {
                    execution.status = 'failed';
                    execution.error = result.error;
                    break;
                }

                // Handle condition branching
                if (step.type === 'condition' && result.output) {
                    const jumpTo = result.output === 'true' ? step.onTrue : step.onFalse;
                    if (jumpTo) {
                        const jumpIndex = workflow.steps.findIndex(s => s.id === jumpTo);
                        if (jumpIndex !== -1) {
                            i = jumpIndex - 1; // -1 because loop will increment
                        }
                    }
                }
            }

            if (execution.status !== 'failed') {
                execution.status = 'completed';
            }
        } catch (error) {
            execution.status = 'failed';
            execution.error = error.message;
        }

        execution.completedAt = new Date().toISOString();
        client.emit('workflow-completed', {
            executionId: execution.id,
            status: execution.status,
            error: execution.error
        });

        return execution;
    }

    private async executeStep(
        client: Socket,
        step: WorkflowStep,
        variables: Record<string, string>,
        iface?: ManagedInterface
    ): Promise<StepResult> {
        const startTime = Date.now();
        const result: StepResult = {
            stepId: step.id,
            status: 'success',
            executedAt: new Date().toISOString(),
            durationMs: 0,
        };

        try {
            switch (step.type) {
                case 'speak':
                    await this.executeSpeak(client, step, variables);
                    break;

                case 'wait':
                    await this.executeWait(step);
                    break;

                case 'click':
                    result.output = await this.executeClick(client, step, variables);
                    break;

                case 'type':
                    result.output = await this.executeType(client, step, variables);
                    break;

                case 'read':
                    result.output = await this.executeRead(client, step, variables);
                    if (step.variable && result.output) {
                        variables[step.variable] = result.output;
                    }
                    break;

                case 'navigate':
                    result.output = await this.executeNavigate(client, step, variables);
                    break;

                case 'listen':
                    result.output = await this.executeListen(client, step);
                    if (step.variable && result.output) {
                        variables[step.variable] = result.output;
                    }
                    break;

                case 'condition':
                    result.output = this.evaluateCondition(step, variables) ? 'true' : 'false';
                    break;

                case 'extract':
                    result.output = await this.executeExtract(step, variables);
                    if (step.variable && result.output) {
                        variables[step.variable] = result.output;
                    }
                    break;

                default:
                    result.status = 'skipped';
                    result.output = `Unknown step type: ${step.type}`;
            }
        } catch (error) {
            result.status = 'failed';
            result.error = error.message;
        }

        result.durationMs = Date.now() - startTime;
        return result;
    }

    // Interpolate variables: "Hello {{name}}" -> "Hello John"
    private interpolate(template: string, variables: Record<string, string>): string {
        return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, key) => {
            return variables[key] || match;
        });
    }

    private async executeSpeak(client: Socket, step: WorkflowStep, variables: Record<string, string>) {
        const text = this.interpolate(step.speakTemplate || step.value || '', variables);
        console.log(`Workflow: Speaking "${text}"`);

        const provider = this.ttsFactory.getProvider(client.id);
        if (provider) {
            const stream = await provider.generateAudio(text);
            stream.on('data', (chunk: Buffer) => client.emit('audio-playback', chunk));

            // Wait for stream to finish
            await new Promise<void>((resolve) => {
                stream.on('end', resolve);
                stream.on('error', resolve);
            });
        }
    }

    private async executeBrowserAction(client: Socket, action: string, args: any): Promise<any> {
        console.log(`Workflow: Sending "${action}" to client ${client.id}`);
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Action timed out')), 30000);

            client.emit('perform-action', { action, ...args }, (response: any) => {
                clearTimeout(timeout);
                if (response?.status === 'success') {
                    resolve(response.data);
                } else {
                    reject(new Error(response?.message || 'Action failed'));
                }
            });
        });
    }

    private async executeWait(step: WorkflowStep): Promise<void> {
        const ms = step.waitMs || 1000;
        console.log(`Workflow: Waiting ${ms}ms`);
        await new Promise(resolve => setTimeout(resolve, ms));
    }

    private async executeClick(client: Socket, step: WorkflowStep, variables: Record<string, string>): Promise<string> {
        const selector = this.interpolate(step.selector || '', variables);
        return this.executeBrowserAction(client, 'click', { selector });
    }

    private async executeType(client: Socket, step: WorkflowStep, variables: Record<string, string>): Promise<string> {
        const selector = this.interpolate(step.selector || '', variables);
        const text = this.interpolate(step.value || '', variables);
        return this.executeBrowserAction(client, 'type', { selector, text });
    }

    private async executeRead(client: Socket, step: WorkflowStep, variables: Record<string, string>): Promise<string> {
        const selector = this.interpolate(step.selector || '', variables);
        return this.executeBrowserAction(client, 'read', { selector });
    }

    private async executeNavigate(client: Socket, step: WorkflowStep, variables: Record<string, string>): Promise<string> {
        const url = this.interpolate(step.url || '', variables);
        return this.executeBrowserAction(client, 'navigate', { url });
    }

    private async executeListen(client: Socket, step: WorkflowStep): Promise<string> {
        const timeout = (step.listenTimeout || 10) * 1000;
        console.log(`Workflow: Listening for ${timeout}ms`);

        // Wait for transcript from client
        return new Promise((resolve) => {
            const timer = setTimeout(() => resolve(''), timeout);

            const handler = (data: any) => {
                if (data.isFinal && data.text) {
                    clearTimeout(timer);
                    client.off('transcript-part', handler);
                    resolve(data.text);
                }
            };
            client.on('transcript-part', handler);
        });
    }

    private evaluateCondition(step: WorkflowStep, variables: Record<string, string>): boolean {
        if (!step.condition) return false;

        const { variable, operator, value } = step.condition;
        const varValue = variables[variable] || '';
        const compareValue = this.interpolate(value, variables);

        switch (operator) {
            case 'equals': return varValue === compareValue;
            case 'contains': return varValue.toLowerCase().includes(compareValue.toLowerCase());
            case 'gt': return parseFloat(varValue) > parseFloat(compareValue);
            case 'lt': return parseFloat(varValue) < parseFloat(compareValue);
            case 'exists': return !!varValue;
            case 'empty': return !varValue;
            default: return false;
        }
    }

    private async executeExtract(step: WorkflowStep, variables: Record<string, string>): Promise<string> {
        const text = variables[step.selector || ''] || '';
        const pattern = step.extractPattern || '(.*)';
        const match = text.match(new RegExp(pattern));
        return match ? match[1] || match[0] : '';
    }

    // Trigger workflow by intent
    async triggerByIntent(client: Socket, intent: string, variables: Record<string, string> = {}) {
        const workflow = this.storage.getWorkflowByTrigger('intent', intent);
        if (workflow) {
            console.log(`Triggering workflow "${workflow.name}" for intent "${intent}"`);
            return this.executeWorkflow(client, workflow.id, variables);
        }
        return null;
    }

    getExecution(executionId: string): WorkflowExecution | undefined {
        return this.activeExecutions.get(executionId);
    }
}
