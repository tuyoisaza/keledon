import {
    RpaProvider,
    RpaProviderConfig,
    StandardAction,
    RpaExecutionResult,
    interpolateVariables,
} from '../capabilities/rpa/interfaces/rpa-provider.interface';

export class LocalHttpRpaProvider implements RpaProvider {
    readonly name = 'local-http';
    readonly requiresBackend = true;
    readonly requiresApiKey = false;

    private apiUrl: string | null = null;
    private connected = false;

    async connect(config: RpaProviderConfig): Promise<void> {
        this.apiUrl = config.apiUrl || process.env.RPA_LOCAL_URL || null;
        if (!this.apiUrl) {
            throw new Error('LocalHttpRpaProvider: Missing RPA_LOCAL_URL');
        }
        this.connected = true;
    }

    async disconnect(): Promise<void> {
        this.connected = false;
    }

    isConnected(): boolean {
        return this.connected;
    }

    async execute(action: StandardAction, variables: Record<string, string>): Promise<RpaExecutionResult> {
        const startTime = Date.now();
        if (!this.apiUrl) {
            return {
                success: false,
                actionId: action.id,
                durationMs: 0,
                error: 'Local RPA endpoint not configured',
            };
        }

        const processed = this.processAction(action, variables);

        try {
            const response = await fetch(`${this.apiUrl}/actions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: processed, variables })
            });

            if (!response.ok) {
                const errorText = await response.text();
                return {
                    success: false,
                    actionId: action.id,
                    durationMs: Date.now() - startTime,
                    error: `Local RPA error: ${response.status} ${errorText}`,
                };
            }

            const data = await response.json();
            return {
                success: data.success ?? true,
                actionId: action.id,
                durationMs: Date.now() - startTime,
                output: data.output,
                screenshot: data.screenshot,
                error: data.error,
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
        if (!this.apiUrl) {
            return actions.map(action => ({
                success: false,
                actionId: action.id,
                durationMs: 0,
                error: 'Local RPA endpoint not configured',
            }));
        }

        const processedActions = actions.map(action => this.processAction(action, variables));

        const response = await fetch(`${this.apiUrl}/workflows`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ actions: processedActions, variables })
        });

        if (!response.ok) {
            const errorText = await response.text();
            return processedActions.map(action => ({
                success: false,
                actionId: action.id,
                durationMs: 0,
                error: `Local RPA error: ${response.status} ${errorText}`,
            }));
        }

        const data = await response.json();
        const results = Array.isArray(data.results) ? data.results : [];
        results.forEach((result: RpaExecutionResult, index: number) => onStep?.(index, result));
        return results;
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
