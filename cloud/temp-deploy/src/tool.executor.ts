import { Injectable } from '@nestjs/common';
import { ToolDefinition, ToolCall } from './capabilities/llm/interfaces/llm-provider.interface';

export interface ToolResult {
    success: boolean;
    message: string;
    data?: any;
}

@Injectable()
export class ToolExecutor {
    private tools: Map<string, (args: any) => Promise<ToolResult>> = new Map();

    constructor() {
        this.registerDefaultTools();
    }

    private registerDefaultTools() {
        // Click tool
        this.tools.set('click', async (args: { selector: string }) => {
            console.log(`Tool: Clicking element: ${args.selector}`);
            // In real impl, this would use chrome.debugger or puppeteer
            return { success: true, message: `Clicked ${args.selector}` };
        });

        // Type tool
        this.tools.set('type', async (args: { selector: string, text: string }) => {
            console.log(`Tool: Typing "${args.text}" into ${args.selector}`);
            return { success: true, message: `Typed into ${args.selector}` };
        });

        // Navigate tool
        this.tools.set('navigate', async (args: { url: string }) => {
            console.log(`Tool: Navigating to ${args.url}`);
            return { success: true, message: `Navigated to ${args.url}` };
        });

        // Read tool
        this.tools.set('read_page', async (args: { selector?: string }) => {
            console.log(`Tool: Reading page content`);
            return { success: true, message: 'Page content read', data: 'Simulated content' };
        });

        // Wait tool
        this.tools.set('wait', async (args: { milliseconds: number }) => {
            await new Promise(r => setTimeout(r, args.milliseconds));
            return { success: true, message: `Waited ${args.milliseconds}ms` };
        });
    }

    getToolDefinitions(): ToolDefinition[] {
        return [
            {
                name: 'click',
                description: 'Click an element on the page',
                parameters: { type: 'object', properties: { selector: { type: 'string', description: 'CSS selector' } }, required: ['selector'] }
            },
            {
                name: 'type',
                description: 'Type text into an input field',
                parameters: { type: 'object', properties: { selector: { type: 'string' }, text: { type: 'string' } }, required: ['selector', 'text'] }
            },
            {
                name: 'navigate',
                description: 'Navigate to a URL',
                parameters: { type: 'object', properties: { url: { type: 'string' } }, required: ['url'] }
            },
            {
                name: 'read_page',
                description: 'Read content from the current page',
                parameters: { type: 'object', properties: { selector: { type: 'string', description: 'Optional CSS selector' } } }
            },
            {
                name: 'wait',
                description: 'Wait for a specified time',
                parameters: { type: 'object', properties: { milliseconds: { type: 'number' } }, required: ['milliseconds'] }
            }
        ];
    }

    async execute(call: ToolCall): Promise<ToolResult> {
        const tool = this.tools.get(call.name);
        if (!tool) {
            return { success: false, message: `Unknown tool: ${call.name}` };
        }
        return tool(call.arguments);
    }
}
