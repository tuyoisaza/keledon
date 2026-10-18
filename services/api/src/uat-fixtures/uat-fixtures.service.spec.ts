import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { UatFixturesService } from './uat-fixtures.service';

describe('bounded audited fixture provisioning', () => {
  const runId = 'phdk-uat-0af7f175-a294-47dc-a6ca-1c40e99640ae';
  const input = { runId, userIds: ['synthetic-a', 'synthetic-b'], ttlHours: 1 };
  const create = jest.fn();
  const tx = {
    $executeRaw: jest.fn().mockResolvedValue(1),
    user: { findUnique: jest.fn(), findMany: jest.fn() },
    uatFixtureRun: { findUnique: jest.fn(), count: jest.fn() },
    company: { create },
  };
  const prisma = { $transaction: jest.fn(async (callback) => callback(tx)) };
  const service = new UatFixturesService(prisma as any);
  beforeEach(() => {
    jest.clearAllMocks();
    tx.user.findUnique.mockResolvedValue({ id: 'actor', role: 'superadmin' });
    tx.uatFixtureRun.findUnique.mockResolvedValue(null);
    tx.uatFixtureRun.count.mockResolvedValue(0);
  });
  it('rejects privilege and lifecycle fields before opening a transaction', async () => {
    await expect(service.create('actor', { ...input, role: 'superadmin' })).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
  it('rejects TTL extension beyond the approved 24-hour bound', async () => {
    await expect(service.create('actor', { ...input, ttlHours: 25 })).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
  it('reloads actor authority from the database and rejects a regular actor', async () => {
    tx.user.findUnique.mockResolvedValue({ id: 'actor', role: 'user' });
    await expect(service.create('actor', input)).rejects.toBeInstanceOf(ForbiddenException);
    expect(create).not.toHaveBeenCalled();
  });
  it('does not create extra tenants when a retained run exists', async () => {
    tx.uatFixtureRun.count.mockResolvedValue(1);
    await expect(service.create('actor', input)).rejects.toBeInstanceOf(ConflictException);
    expect(create).not.toHaveBeenCalled();
  });
  it('rejects customer or previously used identities before any fixture write', async () => {
    tx.user.findMany.mockResolvedValue([
      { id: 'synthetic-a', role: 'user', email: 'customer@example.com', passwordHash: 'hash', _count: { devices: 0 } },
      { id: 'synthetic-b', role: 'user', email: 'phdk-uat-b@example.invalid', passwordHash: 'hash', _count: { devices: 0 } },
    ]);
    await expect(service.create('actor', input)).rejects.toBeInstanceOf(BadRequestException);
    expect(create).not.toHaveBeenCalled();
  });
  it('returns the original run for a retry without creating resources or renewing TTL', async () => {
    const expiresAt = new Date(Date.now() + 1000);
    tx.uatFixtureRun.findUnique.mockResolvedValue({ id: runId, createdBy: 'actor', expiresAt, retiredAt: null,
      members: JSON.stringify(input.userIds.map(userId => ({ userId }))) });
    const result = await service.create('actor', input);
    expect(result.expiresAt).toBe(expiresAt);
    expect(create).not.toHaveBeenCalled();
  });
});
