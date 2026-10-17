import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const SECRET_FIELD =
  /(?:password|passwd|token|secret|api[-_]?key|authorization|credential|private[-_]?key|access[-_]?key)/i;
const SECRET_VALUE =
  /\bBearer\s+[-A-Za-z0-9._~+/]+=*|\bsk-[A-Za-z0-9]{12,}\b/gi;

function safeAuditChanges(value: string | null): string | null {
  if (!value) return value;
  if (value.length > 50000) return '[Audit details omitted: size limit]';
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return '[Audit details omitted: invalid stored format]';
  }
  let visited = 0;
  const redact = (item: unknown, depth: number, key = ''): unknown => {
    visited += 1;
    if (SECRET_FIELD.test(key)) return '[REDACTED]';
    if (visited > 500 || depth > 6) return '[TRUNCATED]';
    if (typeof item === 'string')
      return item.slice(0, 10000).replace(SECRET_VALUE, '[REDACTED]');
    if (Array.isArray(item))
      return item.slice(0, 100).map((entry) => redact(entry, depth + 1));
    if (item && typeof item === 'object')
      return Object.fromEntries(
        Object.entries(item as Record<string, unknown>)
          .slice(0, 100)
          .map(([childKey, child]) => [
            childKey,
            redact(child, depth + 1, childKey),
          ]),
      );
    return item;
  };
  return JSON.stringify(redact(parsed, 0));
}

function parseAuditDate(
  value: string | undefined,
  endOfDay = false,
): Date | undefined {
  if (value === undefined) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    if (date.toISOString().slice(0, 10) !== value) return undefined;
    if (endOfDay) date.setUTCHours(23, 59, 59, 999);
  }
  return date;
}

@Injectable()
export class CrudAuditService {
  constructor(private readonly prisma: PrismaService) {}

  async getAuditLogs(params?: {
    companyId?: string;
    limit?: number;
    offset?: number;
    action?: string;
    entity?: string;
    userId?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const {
      companyId,
      limit = 100,
      offset = 0,
      action,
      entity,
      userId,
      startDate,
      endDate,
    } = params || {};

    if (
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > 200 ||
      !Number.isInteger(offset) ||
      offset < 0 ||
      offset > 1_000_000
    )
      throw new BadRequestException('Invalid audit pagination');
    for (const [name, value, max] of [
      ['companyId', companyId, 128],
      ['action', action, 80],
      ['entity', entity, 100],
      ['userId', userId, 128],
    ] as const) {
      if (
        value !== undefined &&
        (typeof value !== 'string' || !value.trim() || value.length > max)
      )
        throw new BadRequestException(`Invalid audit ${name} filter`);
    }
    if (
      [startDate, endDate].some(
        (value) => value !== undefined && value.length > 40,
      )
    )
      throw new BadRequestException('Invalid audit date range');
    const parsedStart = parseAuditDate(startDate);
    const parsedEnd = parseAuditDate(endDate, true);
    if (
      (startDate !== undefined && !parsedStart) ||
      (endDate !== undefined && !parsedEnd) ||
      (parsedStart && parsedEnd && parsedStart > parsedEnd)
    )
      throw new BadRequestException('Invalid audit date range');

    // Build where clause
    const where: any = {};

    if (companyId) {
      const userIds = (
        await this.prisma.user.findMany({
          where: { companyId },
          select: { id: true },
        })
      ).map((u) => u.id);
      const scopedUserIds = userIds.filter((id) => !userId || id === userId);
      where.OR = [
        { companyId, ...(userId ? { userId } : {}) },
        { companyId: null, userId: { in: scopedUserIds } },
      ];
    }

    if (userId && !companyId) {
      where.userId = userId;
    }

    if (action) {
      where.action = action;
    }

    if (entity) {
      where.entity = entity;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (parsedStart) where.createdAt.gte = parsedStart;
      if (parsedEnd) where.createdAt.lte = parsedEnd;
    }

    // Fetch audit logs with pagination
    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: limit,
        skip: offset,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    // Enrich with user info (name + email)
    const userIdsInLogs = [
      ...new Set(logs.map((l) => l.userId).filter(Boolean)),
    ] as string[];
    const users =
      userIdsInLogs.length > 0
        ? await this.prisma.user.findMany({
            where: { id: { in: userIdsInLogs } },
            select: { id: true, name: true, email: true },
          })
        : [];
    const userMap = new Map(users.map((u) => [u.id, u]));

    const enriched = logs.map((log) => ({
      id: log.id,
      userId: log.userId,
      action: log.action,
      entity: log.entity,
      entityId: log.entityId,
      changes: safeAuditChanges(log.changes),
      createdAt: log.createdAt,
      user: log.userId ? userMap.get(log.userId) || null : null,
    }));

    return {
      data: enriched,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    };
  }
}
