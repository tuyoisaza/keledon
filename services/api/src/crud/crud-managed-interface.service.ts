import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { encryptManagedInterfaceSecretAtRest } from '../security/vendor-secret-crypto';
import { normalizeVendorBaseUrl } from '../vendor-url-policy';
function assertManagedInterfaceFields(
  input: object,
  allowed: readonly string[],
): void {
  const value = input as Record<string, unknown>;
  if (Object.keys(value).some((key) => !allowed.includes(key))) {
    throw new BadRequestException('Unsupported managed interface field');
  }
  const stringLimits: Record<string, number> = {
    companyId: 128,
    name: 120,
    baseUrl: 2048,
    category: 40,
    providerKey: 120,
    capabilities: 16000,
    icon: 500,
    status: 40,
    credentials: 16000,
  };
  for (const [key, limit] of Object.entries(stringLimits)) {
    const field = value[key];
    if (field !== undefined && (typeof field !== 'string' || field.length > limit)) {
      throw new BadRequestException(`Invalid managed interface ${key}`);
    }
  }
}

@Injectable()
export class CrudManagedInterfaceService {
 constructor(private readonly prisma: PrismaService) {}
  async getManagedInterfaces(companyId?: string, includeDestination = false) {
    const rows = await this.prisma.managedInterface.findMany({
      where: companyId ? { companyId } : undefined,
      orderBy: { name: 'asc' },
    });
    return rows.map(({ credentials, baseUrl, ...record }) => ({
      ...record,
      ...(includeDestination ? { baseUrl } : {}),
      hasCredentials: !!credentials,
    }));
  }

  async getManagedInterface(id: string, includeDestination = false) {
    const row = await this.prisma.managedInterface.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        baseUrl: true,
        category: true,
        providerKey: true,
        capabilities: true,
        icon: true,
        status: true,
        credentials: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!row) return null;
    const { credentials, baseUrl, ...record } = row;
    return {
      ...record,
      ...(includeDestination ? { baseUrl } : {}),
      hasCredentials: !!credentials,
    };
  }

  async createManagedInterface(data: {
    companyId: string;
    name: string;
    baseUrl: string;
    category?: string;
    providerKey?: string;
    capabilities?: string;
    icon?: string;
    status?: string;
    credentials?: string;
  }) {
    assertManagedInterfaceFields(data, [
      'companyId', 'name', 'baseUrl', 'category', 'providerKey',
      'capabilities', 'icon', 'status', 'credentials',
    ]);
    if (typeof data.companyId !== 'string' || !data.companyId.trim()) {
      throw new BadRequestException('An owning company is required');
    }
    if (typeof data.name !== 'string' || !data.name.trim()) {
      throw new BadRequestException('Interface name is required');
    }
    const company = await this.prisma.company.findUnique({
      where: { id: data.companyId },
      select: { id: true },
    });
    if (!company) throw new BadRequestException('Owning company does not exist');
    let baseUrl: string | undefined;
    try {
      baseUrl = normalizeVendorBaseUrl(data.baseUrl);
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : 'Invalid interface URL');
    }
    if (!baseUrl) throw new BadRequestException('Interface base URL is required');
    const { credentials, ...record } = data;
    const storedCredentials =
      credentials === undefined
        ? undefined
        : encryptManagedInterfaceSecretAtRest(credentials);
    const created = await this.prisma.managedInterface.create({
      data: {
        ...record,
        baseUrl,
        ...(storedCredentials === undefined
          ? {}
          : { credentials: storedCredentials }),
      },
    });
    const { credentials: storedValue, ...safeRecord } = created;
    return { ...safeRecord, hasCredentials: !!storedValue };
  }

  async updateManagedInterface(
    id: string,
    data: {
      name?: string;
      baseUrl?: string;
      category?: string;
      status?: string;
      providerKey?: string;
      capabilities?: string;
      icon?: string;
      credentials?: string;
    },
  ) {
    assertManagedInterfaceFields(data, [
      'name', 'baseUrl', 'category', 'status', 'credentials',
      'providerKey', 'capabilities', 'icon',
    ]);
    if (data.name !== undefined && !data.name.trim()) {
      throw new BadRequestException('Interface name cannot be empty');
    }
    if (data.baseUrl !== undefined) {
      try {
        data = { ...data, baseUrl: normalizeVendorBaseUrl(data.baseUrl) };
      } catch (error) {
        throw new BadRequestException(error instanceof Error ? error.message : 'Invalid interface URL');
      }
      if (!data.baseUrl) throw new BadRequestException('Interface base URL is required');
    }
    const { credentials, ...record } = data;
    const storedCredentials =
      credentials === undefined
        ? undefined
        : encryptManagedInterfaceSecretAtRest(credentials);
    const updated = await this.prisma.managedInterface.update({
      where: { id },
      data: {
        ...record,
        ...(storedCredentials === undefined
          ? {}
          : { credentials: storedCredentials }),
      },
    });
    const { credentials: storedValue, ...safeRecord } = updated;
    return { ...safeRecord, hasCredentials: !!storedValue };
  }

  async deleteManagedInterface(id: string) {
    return this.prisma.managedInterface.delete({ where: { id } });
  }

  async getTeamInterfaces(teamId: string, companyId?: string, includeDestination = false) {
    const teamInterfaces = await this.prisma.teamInterface.findMany({
      where: {
        teamId,
        ...(companyId
          ? {
              team: { brand: { companyId } },
              managedInterface: { companyId },
            }
          : {}),
      },
      include: { managedInterface: true },
    });
    return teamInterfaces.map(
      ({ managedInterface: { credentials, baseUrl, ...record }, ...assignment }) => ({
        ...assignment,
        ...record,
        ...(includeDestination ? { baseUrl } : {}),
        hasCredentials: !!credentials,
      }),
    );
  }

  async setTeamInterfaces(
    teamId: string,
    interfaceIds: string[],
    companyId?: string,
  ) {
    if (
      !Array.isArray(interfaceIds) ||
      interfaceIds.some(
        (interfaceId) =>
          typeof interfaceId !== 'string' || interfaceId.trim().length === 0,
      )
    ) {
      throw new BadRequestException('interfaceIds must be an array of IDs');
    }
    const uniqueIds = [...new Set(interfaceIds)];
    if (uniqueIds.length !== interfaceIds.length) {
      throw new BadRequestException('interfaceIds must not contain duplicates');
    }
    const existing = await this.prisma.managedInterface.findMany({
      where: { id: { in: uniqueIds }, ...(companyId ? { companyId } : {}) },
      select: { id: true },
    });
    if (existing.length !== uniqueIds.length) {
      throw new BadRequestException('One or more interfaces do not exist');
    }
    return this.prisma.$transaction(async (tx) => {
      if (companyId) {
        const team = await tx.team.findFirst({
          where: { id: teamId, brand: { companyId } },
          select: { id: true },
        });
        if (!team) throw new ForbiddenException('Resource access denied');
      }
      await tx.teamInterface.deleteMany({
        where: {
          teamId,
          ...(companyId ? { managedInterface: { companyId } } : {}),
        },
      });
      if (uniqueIds.length === 0) return { count: 0 };
      return tx.teamInterface.createMany({
        data: uniqueIds.map((interfaceId) => ({ teamId, interfaceId })),
      });
    });
  }

}
