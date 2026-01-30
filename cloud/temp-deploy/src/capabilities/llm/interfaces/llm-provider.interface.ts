import { Observable } from 'rxjs';

export interface LlmProvider {
    generateResponse(messages: any[], options?: any): Observable<string>;
}

// Tool schema for function calling
export interface ToolDefinition {
    name: string;
    description: string;
    parameters: Record<string, any>;
}

export interface ToolCall {
    name: string;
    arguments: Record<string, any>;
}
