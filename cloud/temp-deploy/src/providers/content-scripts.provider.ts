import {
    RpaProvider,
    RpaProviderConfig,
    StandardAction,
    RpaExecutionResult,
    interpolateVariables,
} from '../capabilities/rpa/interfaces/rpa-provider.interface';

/**
 * ContentScriptsProvider - Executes actions via Chrome Extension content scripts
 * 
 * This is the FREE provider that runs entirely in the browser.
 * Actions are sent to the Chrome Extension which executes them in the target page.
 */
export class ContentScriptsProvider implements RpaProvider {
    readonly name = 'content-scripts';
    readonly requiresBackend = false;
    readonly requiresApiKey = false;

    private connected = false;
    private sendToExtension: ((event: string, data: unknown) => void) | null = null;

    async connect(config: RpaProviderConfig): Promise<void> {
        this.connected = true;
        console.log('ContentScriptsProvider connected');
    }

    async disconnect(): Promise<void> {
        this.connected = false;
    }

    isConnected(): boolean {
        return this.connected;
    }

    // Set the callback to send events to the Chrome Extension
    setExtensionCallback(callback: (event: string, data: unknown) => void) {
        this.sendToExtension = callback;
    }

    async execute(action: StandardAction, variables: Record<string, string>): Promise<RpaExecutionResult> {
        const startTime = Date.now();

        // Interpolate variables in action
        const processedAction = this.processAction(action, variables);

        // For now, log the action - actual execution would be via Chrome Extension
        console.log(`ContentScripts executing: ${action.type}`, processedAction);

        // Simulate success for now - real implementation sends to Chrome Extension
        return {
            success: true,
            actionId: action.id,
            durationMs: Date.now() - startTime,
        };
    }

    async executeWorkflow(
        actions: StandardAction[],
        variables: Record<string, string>,
        onStep?: (stepIndex: number, result: RpaExecutionResult) => void
    ): Promise<RpaExecutionResult[]> {
        const results: RpaExecutionResult[] = [];
        const workingVariables = { ...variables };

        for (let i = 0; i < actions.length; i++) {
            const action = actions[i];
            const result = await this.execute(action, workingVariables);
            results.push(result);

            // Save output to variables if specified
            if (action.saveAs && result.output) {
                workingVariables[action.saveAs] = result.output;
            }

            onStep?.(i, result);

            // Stop on failure unless action is optional
            if (!result.success && !action.optional) {
                break;
            }
        }

        return results;
    }

    private processAction(action: StandardAction, variables: Record<string, string>): StandardAction {
        const processed = { ...action };

        // Interpolate variables in value
        if (processed.value) {
            processed.value = interpolateVariables(processed.value, variables);
        }

        // Interpolate variables in URL
        if (processed.url) {
            processed.url = interpolateVariables(processed.url, variables);
        }

        // Interpolate variables in selectors
        if (processed.target?.selector) {
            processed.target = {
                ...processed.target,
                selector: interpolateVariables(processed.target.selector, variables),
            };
        }

        return processed;
    }
}
