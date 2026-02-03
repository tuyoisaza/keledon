import { ToolExecutor } from './tool.executor';

describe('ToolExecutor', () => {
    let executor: ToolExecutor;

    beforeEach(() => {
        executor = new ToolExecutor();
    });

    describe('getToolDefinitions', () => {
        it('should return 5 default tools', () => {
            const tools = executor.getToolDefinitions();
            expect(tools.length).toBe(5);
            expect(tools.map(t => t.name)).toContain('click');
            expect(tools.map(t => t.name)).toContain('type');
            expect(tools.map(t => t.name)).toContain('navigate');
            expect(tools.map(t => t.name)).toContain('read_page');
            expect(tools.map(t => t.name)).toContain('wait');
        });
    });

    describe('execute', () => {
        it('should execute click tool', async () => {
            const result = await executor.execute({ name: 'click', arguments: { selector: '#btn' } });
            expect(result.success).toBe(true);
            expect(result.message).toContain('#btn');
        });

        it('should execute type tool', async () => {
            const result = await executor.execute({ name: 'type', arguments: { selector: '#input', text: 'hello' } });
            expect(result.success).toBe(true);
        });

        it('should execute navigate tool', async () => {
            const result = await executor.execute({ name: 'navigate', arguments: { url: 'https://example.com' } });
            expect(result.success).toBe(true);
        });

        it('should execute wait tool', async () => {
            const start = Date.now();
            const result = await executor.execute({ name: 'wait', arguments: { milliseconds: 100 } });
            const elapsed = Date.now() - start;
            expect(result.success).toBe(true);
            expect(elapsed).toBeGreaterThanOrEqual(100);
        });

        it('should return error for unknown tool', async () => {
            const result = await executor.execute({ name: 'unknown', arguments: {} });
            expect(result.success).toBe(false);
        });
    });
});
