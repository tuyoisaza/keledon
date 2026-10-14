import { CrudVendorService } from './crud-vendor.service';

describe('CrudVendorService credential handling', () => {
  const priorKey = process.env.KELEDON_VENDOR_KEY;
  const priorEnvironment = process.env.NODE_ENV;

  beforeAll(() => {
    process.env.KELEDON_VENDOR_KEY = 'test-vendor-key-with-adequate-entropy';
    process.env.NODE_ENV = 'test';
  });

  afterAll(() => {
    if (priorKey === undefined) delete process.env.KELEDON_VENDOR_KEY;
    else process.env.KELEDON_VENDOR_KEY = priorKey;
    if (priorEnvironment === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = priorEnvironment;
  });

  it('encrypts credentials before storage and masks username in its response', async () => {
    let stored: any;
    const prisma = {
      vendor: {
        create: jest.fn(({ data }) => {
          stored = {
            id: 'vendor-1',
            ...data,
            isActive: true,
            createdAt: new Date(0),
            updatedAt: new Date(0),
          };
          return stored;
        }),
      },
    };
    const service = new CrudVendorService(prisma as any);

    const result = await service.createVendor({
      teamId: 'team-1',
      name: 'CRM',
      type: 'crm',
      username: 'operator',
      password: 'private-password',
      apiKey: 'private-key',
    });

    expect(stored.username).toMatch(/^keledon:vendor:storage:v1:/);
    expect(stored.password).toMatch(/^keledon:vendor:storage:v1:/);
    expect(stored.apiKey).toMatch(/^keledon:vendor:storage:v1:/);
    expect(result.username).toBe('***');
    expect(result).not.toHaveProperty('password');
    expect(result).not.toHaveProperty('apiKey');
    expect(result.hasPassword).toBe(true);
    expect(result.hasApiKey).toBe(true);
  });
});
