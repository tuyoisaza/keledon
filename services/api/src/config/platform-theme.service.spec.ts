import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { PlatformThemeService, DEFAULT_THEME } from './platform-theme.service';

describe('PlatformThemeService', () => {
  const prisma: any = {
    user: { findUnique: jest.fn() },
    platformSetting: { findUnique: jest.fn() },
    $transaction: jest.fn(),
  };
  const service = new PlatformThemeService(prisma);
  beforeEach(() => jest.clearAllMocks());

  it('denies non-superadmin users based on the stored role', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'tenant-admin',
      role: 'admin',
    });
    await expect(
      service.update('tenant-admin', {
        expectedRevision: 0,
        corporateEnabled: false,
        presets: DEFAULT_THEME.presets,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects CSS values outside the strict hex color contract', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'root',
      role: 'superadmin',
    });
    const presets = structuredClone(DEFAULT_THEME.presets) as any;
    presets.dark.background = 'url(javascript:alert(1))';
    await expect(
      service.update('root', {
        expectedRevision: 0,
        corporateEnabled: false,
        presets,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('allows only a DB-confirmed platform superadmin to read editable settings', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'root',
      role: 'superadmin',
    });
    prisma.platformSetting.findUnique.mockResolvedValue(null);
    await expect(service.readAdmin('root')).resolves.toMatchObject({
      corporateEnabled: true,
      revision: 0,
    });
  });

  it('persists a valid theme revision and its audit entry atomically', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'root',
      role: 'superadmin',
    });
    const update = jest.fn().mockResolvedValue({ revision: 1 });
    const create = jest.fn().mockResolvedValue({ revision: 1 });
    const audit = jest.fn().mockResolvedValue({ id: 'audit-1' });
    prisma.$transaction.mockImplementation((callback: any, options: any) => {
      expect(options).toEqual({ isolationLevel: 'Serializable' });
      return callback({
        platformSetting: {
          findUnique: jest.fn().mockResolvedValue(null),
          create,
          update,
        },
        auditLog: { create: audit },
      });
    });
    await expect(
      service.update('root', {
        expectedRevision: 0,
        corporateEnabled: true,
        presets: DEFAULT_THEME.presets,
      }),
    ).resolves.toMatchObject({ corporateEnabled: true, revision: 1 });
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          key: 'theme.templates',
          revision: 1,
          updatedBy: 'root',
        }),
      }),
    );
    expect(audit).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'root',
          entity: 'PlatformSetting',
        }),
      }),
    );
  });
});
