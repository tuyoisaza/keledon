import { SecurityService } from './security.service';

describe('SecurityService default identity policy', () => {
  it('does not provision a built-in administrator account', async () => {
    const service = new SecurityService();
    service.onModuleInit();
    try {
      const result = await service.authenticate(
        'admin@keledon.com',
        'anything',
        {
          ipAddress: '127.0.0.1',
          userAgent: 'unit-test',
        },
      );

      expect(result).toEqual({ success: false, error: 'Invalid credentials' });
      await expect(
        service.getSecurityEvents({ type: ['login_failed'] }),
      ).resolves.toHaveLength(1);
    } finally {
      service.onModuleDestroy();
    }
  });
});
