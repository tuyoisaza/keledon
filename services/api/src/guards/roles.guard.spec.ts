import { ForbiddenException, ExecutionContext } from '@nestjs/common';
import { RolesGuard } from './roles.guard';

describe('RolesGuard diagnostics authorization', () => {
  const handler = () => undefined;
  const reflector = { getAllAndOverride: jest.fn().mockReturnValue(['admin']) };
  const contextFor = (request: unknown) =>
    ({
      getHandler: () => handler,
      getClass: () => class TestController {},
      switchToHttp: () => ({ getRequest: () => request }),
    }) as unknown as ExecutionContext;

  it('uses the persisted role and rejects an elevated token role', async () => {
    const prisma = {
      user: { findUnique: jest.fn().mockResolvedValue({ role: 'user' }) },
    };
    const guard = new RolesGuard(reflector as any, prisma as any);
    const request = { user: { userId: 'user-1', role: 'admin' } };
    await expect(guard.canActivate(contextFor(request))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      select: { role: true },
    });
  });

  it('does not log actor identifiers while denying access', async () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    const prisma = {
      user: { findUnique: jest.fn().mockResolvedValue({ role: 'user' }) },
    };
    const guard = new RolesGuard(reflector as any, prisma as any);
    await expect(
      guard.canActivate(contextFor({ user: { userId: 'private-user-id' } })),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(log).not.toHaveBeenCalled();
    log.mockRestore();
  });

  it('allows a role only when the database confirms it', async () => {
    const prisma = {
      user: { findUnique: jest.fn().mockResolvedValue({ role: 'admin' }) },
    };
    const guard = new RolesGuard(reflector as any, prisma as any);
    const request = { user: { userId: 'user-2', role: 'user' } };
    await expect(guard.canActivate(contextFor(request))).resolves.toBe(true);
  });
});
