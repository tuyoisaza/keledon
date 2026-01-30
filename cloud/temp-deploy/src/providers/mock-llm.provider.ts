import { Observable, from, timer, concatMap, map } from 'rxjs';
import { LlmProvider } from '../capabilities/llm/interfaces/llm-provider.interface';

export class MockLlmProvider implements LlmProvider {
    generateResponse(messages: any[], options: { useJson?: boolean, systemPrompt?: string } = {}): Observable<string> {
        const lastMessage = messages[messages.length - 1]?.content || '';
        let responseText = '';

        if (options.useJson) {
            const mockResponse = {
                thought: `The user wants: ${lastMessage}. I will process this according to my rules.`,
                action: null as any,
                response: `Simulated response to: ${lastMessage}`
            };

            // Detect simple intents for testing
            if (lastMessage.toLowerCase().includes('close case')) {
                mockResponse.action = {
                    type: 'CLOSE',
                    domain: 'CRM',
                    system: 'Salesforce',
                    resource: 'Case',
                    intent: 'Close Case',
                    payload: { id: '123' },
                    risk: 'CRITICAL',
                    reversibility: 'IRREVERSIBLE',
                    requiredLevel: 4
                };
            } else if (lastMessage.toLowerCase().includes('navigate') || lastMessage.toLowerCase().includes('go to')) {
                mockResponse.action = {
                    type: 'NAVIGATE',
                    domain: 'UI',
                    system: 'Salesforce',
                    resource: 'Home',
                    intent: 'Navigate Home',
                    payload: { url: 'https://salesforce.com/home' },
                    risk: 'LOW',
                    reversibility: 'REVERSIBLE',
                    requiredLevel: 2
                };
            } else if (lastMessage.toLowerCase().includes('start the test flow')) {
                mockResponse.action = {
                    type: 'EXECUTE_FLOW',
                    domain: 'UI',
                    system: 'WebPortal',
                    resource: 'General',
                    intent: 'Test Harness Flow',
                    payload: { flow_id: 'test_harness_flow', params: {} },
                    risk: 'LOW',
                    reversibility: 'REVERSIBLE',
                    requiredLevel: 2
                };
            }


            responseText = JSON.stringify(mockResponse);
        } else {
            responseText = "Hola! Soy el modo simulado. No estoy usando OpenAI, pero funciono igual.";
        }

        const chunks = responseText.split(/(?=[ ,.!])/);

        return from(chunks).pipe(
            concatMap(chunk => timer(50).pipe(map(() => chunk)))
        );
    }
}
