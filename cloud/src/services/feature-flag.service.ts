import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface FeatureFlag {
  id: string;
  name: string;
  enabled: boolean;
  scope: 'global' | 'tenant' | 'user';
  scopeId?: string;
  metadata?: Record<string, unknown>;
  expiresAt?: Date;
}

function parseMetadata(
  value: string | null,
): Record<string, unknown> | undefined {
  if (!value) return undefined;
  try {
    const parsed: unknown = JSON.parse(value);
    return typeof parsed === 'object' &&
      parsed !== null &&
      !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : undefined;
  } catch {
    return undefined;
  }
}

@Injectable()
export class FeatureFlagService {
  private readonly logger = new Logger(FeatureFlagService.name);

  constructor(private prisma: PrismaService) {}

  async isEnabled(
    name: string,
    scope?: string,
    scopeId?: string,
  ): Promise<boolean> {
    const flag = await this.prisma.featureFlag.findFirst({
      where: {
        name,
        enabled: true,
        OR: [
          { scope: 'global' },
          ...(scope && scopeId ? [{ scope, scopeId }] : []),
        ],
      },
    });

    if (!flag) {
      return false;
    }

    if (flag.expiresAt && new Date() > flag.expiresAt) {
      return false;
    }

    return flag.enabled;
  }

  async getAll(): Promise<FeatureFlag[]> {
    const flags = await this.prisma.featureFlag.findMany({
      orderBy: { name: 'asc' },
    });

    return flags.map((f) => ({
      id: f.id,
      name: f.name,
      enabled: f.enabled,
      scope: f.scope as 'global' | 'tenant' | 'user',
      scopeId: f.scopeId || undefined,
      metadata: parseMetadata(f.metadata),
      expiresAt: f.expiresAt || undefined,
    }));
  }

  async create(data: {
    name: string;
    enabled?: boolean;
    scope?: 'global' | 'tenant' | 'user';
    scopeId?: string;
    metadata?: Record<string, unknown>;
    expiresAt?: Date;
  }): Promise<FeatureFlag> {
    const flag = await this.prisma.featureFlag.create({
      data: {
        name: data.name,
        enabled: data.enabled ?? false,
        scope: data.scope ?? 'global',
        scopeId: data.scopeId,
        metadata: data.metadata ? JSON.stringify(data.metadata) : null,
        expiresAt: data.expiresAt,
      },
    });

    this.logger.log(`[FeatureFlag] Created: ${flag.name}`);

    return {
      id: flag.id,
      name: flag.name,
      enabled: flag.enabled,
      scope: flag.scope as 'global' | 'tenant' | 'user',
      scopeId: flag.scopeId || undefined,
      metadata: parseMetadata(flag.metadata),
      expiresAt: flag.expiresAt || undefined,
    };
  }

  async update(id: string, data: Partial<FeatureFlag>): Promise<FeatureFlag> {
    const flag = await this.prisma.featureFlag.update({
      where: { id },
      data: {
        ...(data.enabled !== undefined && { enabled: data.enabled }),
        ...(data.scope !== undefined && { scope: data.scope }),
        ...(data.scopeId !== undefined && { scopeId: data.scopeId }),
        ...(data.metadata !== undefined && {
          metadata: JSON.stringify(data.metadata),
        }),
        ...(data.expiresAt !== undefined && { expiresAt: data.expiresAt }),
      },
    });

    this.logger.log(`[FeatureFlag] Updated: ${flag.name}`);

    return {
      id: flag.id,
      name: flag.name,
      enabled: flag.enabled,
      scope: flag.scope as 'global' | 'tenant' | 'user',
      scopeId: flag.scopeId || undefined,
      metadata: parseMetadata(flag.metadata),
      expiresAt: flag.expiresAt || undefined,
    };
  }

  async delete(id: string): Promise<void> {
    await this.prisma.featureFlag.delete({ where: { id } });
    this.logger.log(`[FeatureFlag] Deleted: ${id}`);
  }

  async toggle(id: string): Promise<FeatureFlag> {
    const flag = await this.prisma.featureFlag.findUnique({ where: { id } });
    if (!flag) {
      throw new Error(`Feature flag ${id} not found`);
    }
    return this.update(id, { enabled: !flag.enabled });
  }
}
