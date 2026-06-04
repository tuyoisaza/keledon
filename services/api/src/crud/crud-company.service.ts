import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CrudCompanyService {
  constructor(private readonly prisma: PrismaService) {}

  // ========== COMPANIES ==========

  async getCompanies() {
    return this.prisma.company.findMany({
      include: {
        countries: true,
        _count: { select: { brands: true, users: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async getCompany(id: string) {
    return this.prisma.company.findUnique({
      where: { id },
      include: {
        countries: true,
        brands: true,
        users: true,
      },
    });
  }

  async createCompany(data: {
    name: string;
    industry?: string;
    countries?: string[];
  }) {
    const { countries, ...companyData } = data;
    return this.prisma.company.create({
      data: {
        ...companyData,
        countries: countries
          ? {
              create: countries.map((code) => ({ countryCode: code })),
            }
          : undefined,
      },
      include: { countries: true },
    });
  }

  async updateCompany(
    id: string,
    data: { name?: string; industry?: string; countries?: string[] },
  ) {
    const { countries, ...companyData } = data;

    // Delete existing countries and create new ones if provided
    if (countries !== undefined) {
      await this.prisma.companyCountry.deleteMany({ where: { companyId: id } });
    }

    const result = await this.prisma.company.update({
      where: { id },
      data: {
        ...companyData,
        ...(countries !== undefined
          ? {
              countries: {
                create: countries.map((code) => ({ countryCode: code })),
              },
            }
          : {}),
      },
      include: { countries: true },
    });

    return result;
  }

  async deleteCompany(id: string) {
    return this.prisma.company.delete({ where: { id } });
  }

  async addCompanyCountry(companyId: string, countryCode: string) {
    return this.prisma.companyCountry.create({
      data: { companyId, countryCode },
    });
  }

  async removeCompanyCountry(companyId: string, countryCode: string) {
    return this.prisma.companyCountry.deleteMany({
      where: { companyId, countryCode },
    });
  }

  // ========== BRANDS ==========

  async getBrands(companyId?: string) {
    return this.prisma.brand.findMany({
      where: companyId ? { companyId } : undefined,
      include: {
        company: { select: { id: true, name: true } },
        _count: { select: { teams: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async createBrand(data: { name: string; companyId: string; color?: string }) {
    return this.prisma.brand.create({
      data,
      include: { company: { select: { id: true, name: true } } },
    });
  }

  async updateBrand(id: string, data: { name?: string; color?: string }) {
    return this.prisma.brand.update({
      where: { id },
      data,
      include: { company: { select: { id: true, name: true } } },
    });
  }

  async deleteBrand(id: string) {
    return this.prisma.brand.delete({ where: { id } });
  }

  // ========== TEAMS ==========

  async getTeams(companyId?: string) {
    const teams = await this.prisma.team.findMany({
      include: {
        users: { select: { id: true } },
        keledons: { select: { id: true } },
        brand: {
          include: {
            company: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return teams.map((t) => ({
      id: t.id,
      name: t.name,
      brandId: t.brandId,
      country: t.country,
      sttProvider: t.sttProvider,
      ttsProvider: t.ttsProvider,
      escalationTriggers: t.escalationTriggers,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      _count: { users: t.users.length, keledons: t.keledons.length },
      company: t.brand?.company
        ? { id: t.brand.company.id, name: t.brand.company.name }
        : undefined,
    }));
  }

  async createTeam(data: { name: string; brandId: string; country?: string }) {
    const team = await this.prisma.team.create({
      data,
      select: {
        id: true,
        name: true,
        brandId: true,
        country: true,
        sttProvider: true,
        ttsProvider: true,
        createdAt: true,
        updatedAt: true,
        brand: {
          select: {
            id: true,
            name: true,
            color: true,
            company: { select: { id: true, name: true } },
          },
        },
      },
    });
    return {
      ...team,
      company: team.brand?.company
        ? { id: team.brand.company.id, name: team.brand.company.name }
        : undefined,
    };
  }

  async updateTeam(
    id: string,
    data: { name?: string; country?: string; escalationTriggers?: string[] },
  ) {
    const team = await this.prisma.team.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        brandId: true,
        country: true,
        sttProvider: true,
        ttsProvider: true,
        escalationTriggers: true,
        createdAt: true,
        updatedAt: true,
        brand: {
          select: {
            id: true,
            name: true,
            color: true,
            company: { select: { id: true, name: true } },
          },
        },
      },
    });
    return {
      ...team,
      company: team.brand?.company
        ? { id: team.brand.company.id, name: team.brand.company.name }
        : undefined,
    };
  }

  async deleteTeam(id: string) {
    return this.prisma.team.delete({ where: { id } });
  }

  // ========== USERS ==========

  async getUsers(companyId?: string) {
    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        companyId: true,
        teamId: true,
        isOnline: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
        company: { select: { id: true, name: true } },
        team: {
          select: {
            id: true,
            name: true,
            brandId: true,
            brand: { select: { id: true, name: true } },
          },
        },
      },
      where: companyId ? { companyId } : undefined,
      orderBy: { name: 'asc' },
    });

    return users.map((u) => ({
      ...u,
      brandId: u.team?.brandId || undefined,
    }));
  }

  async createUser(data: {
    email: string;
    name?: string;
    companyId?: string;
    teamId?: string;
    role?: string;
    passwordHash?: string;
  }) {
    return this.prisma.user.create({
      data,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        companyId: true,
        teamId: true,
        isOnline: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
        company: { select: { id: true, name: true } },
        team: { select: { id: true, name: true, brandId: true } },
      },
    });
  }

  async updateUser(
    id: string,
    data: {
      email?: string;
      name?: string;
      companyId?: string;
      teamId?: string;
      role?: string;
    },
  ) {
    return this.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        companyId: true,
        teamId: true,
        isOnline: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
        company: { select: { id: true, name: true } },
        team: { select: { id: true, name: true, brandId: true } },
      },
    });
  }

  async deleteUser(id: string) {
    return this.prisma.user.delete({ where: { id } });
  }

}
