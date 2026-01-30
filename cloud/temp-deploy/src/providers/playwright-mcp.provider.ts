import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import {
    RpaProvider,
    RpaProviderConfig,
    StandardAction,
    RpaExecutionResult,
    interpolateVariables,
} from '../capabilities/rpa/interfaces/rpa-provider.interface';

/**
 * PlaywrightMcpProvider - Executes actions via Microsoft's Playwright MCP Server
 * 
 * This provider spawns the @playwright/mcp server as a subprocess and communicates
 * with it via the Model Context Protocol (MCP) over stdio.
 */
export class PlaywrightMcpProvider implements RpaProvider {
    readonly name = 'playwright-mcp';
    readonly requiresBackend = true;
    // It doesn't strictly require an API key for itself, but might for OpenAI if used in that mode?
    // The MCP server itself is just a bridge to Playwright.
    readonly requiresApiKey = false;

    private client: Client | null = null;
    private transport: StdioClientTransport | null = null;

    async connect(config: RpaProviderConfig): Promise<void> {
        if (this.client) return;

        console.log('Starting Playwright MCP server...');

        // Spawn the MCP server directly using npx
        // We use 'cmd' on Windows to properly handle npx
        this.transport = new StdioClientTransport({
            command: 'cmd',
            args: ['/c', 'npx', '-y', '@playwright/mcp@latest'],
        });

        this.client = new Client({
            name: "keldon-cloud-client",
            version: "1.0.0",
        }, {
            capabilities: {}
        });

        await this.client.connect(this.transport);
        console.log('Playwright MCP server connected');

        // Initialize a browser session if needed, but MCP usually handles tools statelessly 
        // or effectively "per call" unless resources are managed. 
        // Playwright MCP exposes tools like 'launch_browser', 'navigate', 'click', etc.
        // We might want to ensure a browser is launched.
        // Let's check available tools to be sure.
        const tools = await this.client.listTools();
        console.log('Available MCP tools:', tools.tools.map(t => t.name));
    }

    async disconnect(): Promise<void> {
        if (this.client) {
            await this.client.close();
            this.client = null;
        }
        if (this.transport) {
            // Transport usually closes with client, but we can ensure cleanup
            this.transport = null;
        }
    }

    isConnected(): boolean {
        return !!this.client;
    }

    async execute(action: StandardAction, variables: Record<string, string>): Promise<RpaExecutionResult> {
        if (!this.client) {
            throw new Error('Playwright MCP provider not connected');
        }

        const startTime = Date.now();
        const processedAction = this.processAction(action, variables);

        try {
            let result: any;

            // Map StandardAction to MCP Tools
            switch (processedAction.type) {
                case 'navigate':
                    if (!processedAction.url) throw new Error('Navigate action requires URL');
                    result = await this.callTool('navigate', { url: processedAction.url });
                    break;

                case 'click':
                    if (!processedAction.target?.selector) throw new Error('Click action requires selector');
                    result = await this.callTool('click', { selector: processedAction.target.selector });
                    break;

                case 'type':
                    if (!processedAction.target?.selector) throw new Error('Type action requires selector');
                    result = await this.callTool('fill', {
                        selector: processedAction.target.selector,
                        value: processedAction.value || ''
                    });
                    break;

                case 'read':
                    // Playwright MCP might expose 'evaluate' or 'get_content'. 
                    // Looking at standard playwright MCP tools, usually there's 'evaluate'
                    // or we can use 'screenshot' for visual reading. 
                    // For text reading, we might need to use query_selector or similar if exposed.
                    // IMPORTANT: The specific tool names depend on the server implementation.
                    // Assuming 'evaluate' exists for generic JS execution:
                    if (processedAction.target?.selector) {
                        const script = `document.querySelector('${processedAction.target.selector}')?.innerText`;
                        result = await this.callTool('evaluate', { script });
                    } else {
                        // Read whole page?
                        result = await this.callTool('evaluate', { script: 'document.body.innerText' });
                    }
                    break;

                case 'screenshot':
                    result = await this.callTool('screenshot', {});
                    // Result might be base64 or path.
                    break;

                case 'wait':
                    // Wait is handled by the process delay usually, or we can instruct browser to wait
                    const ms = processedAction.duration || 1000;
                    await new Promise(r => setTimeout(r, ms));
                    result = { success: true };
                    break;

                default:
                    throw new Error(`Action type ${processedAction.type} not supported by Playwright MCP yet`);
            }

            return {
                success: true,
                actionId: action.id,
                durationMs: Date.now() - startTime,
                output: typeof result === 'string' ? result : JSON.stringify(result),
            };

        } catch (error) {
            return {
                success: false,
                actionId: action.id,
                durationMs: Date.now() - startTime,
                error: error.message,
            };
        }
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

            if (action.saveAs && result.output) {
                workingVariables[action.saveAs] = result.output;
            }

            onStep?.(i, result);

            if (!result.success && !action.optional) {
                break;
            }
        }
        return results;
    }

    private async callTool(name: string, args: any): Promise<any> {
        if (!this.client) throw new Error('Not connected');

        const result = await this.client.callTool({
            name,
            arguments: args,
        });

        // MCP results are content arrays
        // We typically want the text content
        const content = result.content as any[];
        if (content && content[0] && content[0].type === 'text') {
            return content[0].text;
        }
        return result;
    }

    private processAction(action: StandardAction, variables: Record<string, string>): StandardAction {
        const processed = { ...action };
        if (processed.value) processed.value = interpolateVariables(processed.value, variables);
        if (processed.url) processed.url = interpolateVariables(processed.url, variables);
        if (processed.target?.selector) {
            processed.target = {
                ...processed.target,
                selector: interpolateVariables(processed.target.selector, variables),
            };
        }
        return processed;
    }
}
