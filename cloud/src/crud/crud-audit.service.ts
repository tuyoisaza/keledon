import { Injectable } from '@nestjs/common';
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
    const where: any = {};

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
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
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
