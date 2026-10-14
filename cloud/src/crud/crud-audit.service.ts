import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CrudAuditService {
  constructor(private readonly prisma: PrismaService) {}

  async createAuditLog(data: {
    userId?: string;
    action: string;
    entity: string;
    entityId?: string;
    changes?: string;
    ipAddress?: string;
    userAgent?: string;
  }) {
    return this.prisma.auditLog.create({ data });
  }

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

    // Build where clause
    const where: Prisma.AuditLogWhereInput = {};

    if (companyId) {
      const userIds = (
        await this.prisma.user.findMany({
          where: { companyId },
          select: { id: true },
        })
      ).map((u) => u.id);
      where.userId = { in: userIds };
    }

    if (userId) {
      where.userId = userId;
    }

    if (action) {
      where.action = action;
    }

    if (entity) {
      where.entity = entity;
    }

    if (startDate || endDate) {
      const from = startDate ? new Date(startDate) : undefined;
      const to = endDate ? new Date(endDate) : undefined;
      if (
        (from && Number.isNaN(from.getTime())) ||
        (to && Number.isNaN(to.getTime()))
      )
        throw new Error('Invalid audit date filter');
      where.createdAt = {
        ...(from ? { gte: from } : {}),
        ...(to ? { lte: to } : {}),
      };
    }

    // Fetch audit logs with pagination
    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    // Enrich with user info (name + email)
    const userIdsInLogs = [
      ...new Set(
        logs
          .map((log) => log.userId)
          .filter((id): id is string => typeof id === 'string'),
      ),
    ];
    const users =
      userIdsInLogs.length > 0
        ? await this.prisma.user.findMany({
            where: { id: { in: userIdsInLogs } },
            select: { id: true, name: true, email: true },
          })
        : [];
    const userMap = new Map(users.map((u) => [u.id, u]));

    const enriched = logs.map((log) => ({
      ...log,
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
