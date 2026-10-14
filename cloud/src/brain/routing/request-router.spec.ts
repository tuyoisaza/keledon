import { RequestRouter } from '../../../brain/routing/request-router';

describe('RequestRouter named route middleware', () => {
  let router: RequestRouter;

  beforeEach(() => {
    jest.useFakeTimers();
    router = new RequestRouter();
  });

  afterEach(() => {
    router.dispose();
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('runs registered route middleware before its handler', async () => {
    const order: string[] = [];
    router.registerMiddleware('tenant', async (_context, next) => {
      order.push('middleware');
      return next();
    });
    router.registerHandler('read', () => {
      order.push('handler');
      return { ok: true };
    });
    router.addRoute({
      id: 'read-tenant',
      name: 'Read tenant',
      path: '/tenant',
      method: 'GET',
      handler: 'read',
      middleware: ['tenant'],
    });

    await expect(
      router.route({ method: 'GET', path: '/tenant' }),
    ).resolves.toEqual({
      ok: true,
    });
    expect(order).toEqual(['middleware', 'handler']);
  });

  it('fails closed when a route middleware name is not registered', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const handler = jest.fn(() => ({ ok: true }));
    router.registerHandler('read', handler);
    router.addRoute({
      id: 'read-protected',
      name: 'Read protected route',
      path: '/protected',
      method: 'GET',
      handler: 'read',
      middleware: ['tenant'],
    });

    const result = await router.route({ method: 'GET', path: '/protected' });

    expect(result).toMatchObject({
      status: 500,
      error: { message: 'Route middleware not registered: tenant' },
    });
    expect(handler).not.toHaveBeenCalled();
  });
});
