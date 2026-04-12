import Fastify from 'fastify';
import { 
  autoBrowseExecutor, 
  AutoBrowseExecutor,
  StructuredGoal,
  ExecutionResult 
} from './executor.js';

const fastify = Fastify({ logger: true });

const executor = new AutoBrowseExecutor();

await executor.launch({ headless: true });
console.log('AutoBrowse service initialized');

fastify.get('/health', async () => {
  return { 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    connection_mode: executor.getConnectionMode(),
    is_connected: executor.isConnected()
  };
});

fastify.post<{ Body: { goal: StructuredGoal; context?: Record<string, unknown> } }>(
  '/execute',
  async (request, reply) => {
    const { goal, context } = request.body;

    if (!goal || !goal.objective) {
      reply.code(400);
      return { error: 'Missing goal.objective in request' };
    }

    try {
      const result = await executor.executeGoal(goal, {
        sessionId: context?.sessionId as string || 'default',
        flowId: context?.flowId as string || 'default',
        targetUrl: context?.targetUrl as string,
        metadata: context
      });
      return result;
    } catch (error) {
      fastify.log.error(error);
      reply.code(500);
      return {
        error: 'Execution failed',
        message: error instanceof Error ? error.message : String(error)
      };
    }
  }
);

fastify.post<{ Body: { cdpUrl: string } }>(
  '/connect-cdp',
  async (request, reply) => {
    const { cdpUrl } = request.body;

    if (!cdpUrl) {
      reply.code(400);
      return { error: 'Missing cdpUrl' };
    }

    try {
      await executor.connectOverCDP({ cdpUrl });
      return { 
        status: 'connected', 
        mode: 'cdp',
        is_connected: executor.isConnected()
      };
    } catch (error) {
      reply.code(500);
      return {
        error: 'CDP connection failed',
        message: error instanceof Error ? error.message : String(error)
      };
    }
  }
);

fastify.get('/screenshot', async (_request, reply) => {
  try {
    const screenshot = await executor.captureScreenshot();
    return { screenshot };
  } catch (error) {
    reply.code(500);
    return { error: String(error) };
  }
});

fastify.get('/url', async (_request, reply) => {
  try {
    const url = await executor.getPageURL();
    return { url };
  } catch (error) {
    reply.code(500);
    return { error: String(error) };
  }
});

const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '8765');
    const host = process.env.HOST || '0.0.0.0';

    await fastify.listen({ port, host });
    console.log(`AutoBrowse service listening on ${host}:${port}`);
    console.log(`Mode: ${executor.getConnectionMode()}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

process.on('SIGINT', async () => {
  await executor.cleanup();
  await fastify.close();
  process.exit(0);
});

start();