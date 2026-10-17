import 'reflect-metadata';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { PrismaClient } from '@prisma/client';
import { AuthGuard } from '../src/guards/auth.guard';
import { CrudAccessGuard } from '../src/guards/crud-access.guard';
import { LocalAuthService } from '../src/auth-local/auth-local.service';
import { UatTestProfilesService } from '../src/auth-local/uat-test-profiles.service';
import { validateUatPrepTarget } from './uat-prep-companyco.policy.cjs';

const companyIds = { companyCo: 'phdk-uat-companyco', otherCo: 'phdk-uat-otherco' };
const brandIds = { companyCo: 'phdk-uat-companyco-brand', otherCo: 'phdk-uat-otherco-brand' };
const teamIds = { companyCo: 'phdk-uat-companyco-team', otherCo: 'phdk-uat-otherco-team' };
const interfaceIds = { companyCo: 'phdk-uat-companyco-mock-crm', otherCo: 'phdk-uat-otherco-mock-crm' };
const fixtures = [
  { id: 'phdk-uat-superadmin', email: 'uat-superadmin@companyco.example.invalid', name: 'PHDK UAT Company Co Platform Admin', role: 'superadmin', companyId: null, teamId: null },
  { id: 'phdk-uat-admin', email: 'uat-admin@companyco.example.invalid', name: 'PHDK UAT Company Co Admin', role: 'admin', companyId: companyIds.companyCo, teamId: teamIds.companyCo },
  { id: 'phdk-uat-coordinator', email: 'uat-coordinator@companyco.example.invalid', name: 'PHDK UAT Company Co Coordinator', role: 'coordinator', companyId: companyIds.companyCo, teamId: teamIds.companyCo },
  { id: 'phdk-uat-agent', email: 'uat-agent@companyco.example.invalid', name: 'PHDK UAT Company Co Agent', role: 'agent', companyId: companyIds.companyCo, teamId: teamIds.companyCo },
  { id: 'phdk-uat-user', email: 'uat-user@companyco.example.invalid', name: 'PHDK UAT Company Co User', role: 'user', companyId: companyIds.companyCo, teamId: teamIds.companyCo },
  { id: 'phdk-uat-other-user', email: 'uat-user@otherco.example.invalid', name: 'PHDK UAT Other Co User', role: 'user', companyId: companyIds.otherCo, teamId: teamIds.otherCo },
];

function assertOwned(existing: any, expected: Record<string, unknown>, label: string) {
  if (!existing || Object.entries(expected).some(([key, value]) => existing[key] !== value)) {
    throw new Error(`Refusing to modify an existing record that is not the expected ${label} fixture.`);
  }
}

async function ensureOrg(prisma: PrismaClient, companyId: string, brandId: string, teamId: string, name: string) {
  const companyName = `PHDK UAT ${name}`;
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (company) assertOwned(company, { name: companyName, industry: 'coffee shop' }, 'company');
  else await prisma.company.create({ data: { id: companyId, name: companyName, industry: 'coffee shop' } });

  const brandName = `${companyName} Brand`;
  const brand = await prisma.brand.findUnique({ where: { id: brandId } });
  if (brand) assertOwned(brand, { companyId, name: brandName }, 'brand');
  else await prisma.brand.create({ data: { id: brandId, companyId, name: brandName } });

  const teamName = `${companyName} Team`;
  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (team) assertOwned(team, { brandId, name: teamName }, 'team');
  else await prisma.team.create({ data: { id: teamId, brandId, name: teamName } });

  const managedInterface = await prisma.managedInterface.findUnique({ where: { id: companyId === companyIds.companyCo ? interfaceIds.companyCo : interfaceIds.otherCo } });
  const id = companyId === companyIds.companyCo ? interfaceIds.companyCo : interfaceIds.otherCo;
  const interfaceName = `${companyName} Mock CRM`;
  if (managedInterface) assertOwned(managedInterface, { companyId, name: interfaceName, providerKey: 'phdk-uat-mock' }, 'interface');
  else {
    await prisma.managedInterface.create({
      data: {
        id,
        companyId,
        name: interfaceName,
        baseUrl: `https://${companyId}.crm.example.invalid`,
        providerKey: 'phdk-uat-mock',
        category: 'case',
        status: 'disconnected',
        credentials: null,
      },
    });
  }
}

async function ensureUser(prisma: PrismaClient, fixture: (typeof fixtures)[number], passwordHash: string) {
  const existing = await prisma.user.findUnique({ where: { id: fixture.id } });
  const identity = {
    email: fixture.email,
    name: fixture.name,
    role: fixture.role,
    companyId: fixture.companyId,
    teamId: fixture.teamId,
  };
  if (existing) {
    assertOwned(existing, identity, 'user');
    await prisma.user.update({ where: { id: fixture.id }, data: { passwordHash } });
  } else {
    await prisma.user.create({ data: { id: fixture.id, ...identity, passwordHash } });
  }
}

function makeContext(req: any) {
  return {
    getHandler: () => ({ name: req.handler || 'operation' }),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => req }),
  } as any;
}

export async function provisionAndVerify() {
  validateUatPrepTarget();
  process.env.NODE_ENV = 'development';
  process.env.KELEDON_DEPLOYMENT_ENV = 'development';
  process.env.KELEDON_ENABLE_UAT_TEST_PROFILES = 'true';
  process.env.KELEDON_AUTH_SECRET = randomBytes(48).toString('base64url');
  process.env.KELEDON_UAT_TEST_PROFILE_IDS = fixtures
    .filter(({ role }) => ['admin', 'coordinator', 'user'].includes(role))
    .map(({ id }) => id)
    .join(',');

  const prisma = new PrismaClient();
  const passwords = new Map<string, string>();
  try {
    await prisma.$transaction(async (tx) => {
      await ensureOrg(tx as PrismaClient, companyIds.companyCo, brandIds.companyCo, teamIds.companyCo, 'Company Co');
      await ensureOrg(tx as PrismaClient, companyIds.otherCo, brandIds.otherCo, teamIds.otherCo, 'Other Co');
      for (const fixture of fixtures) {
        const password = randomBytes(36).toString('base64url');
        passwords.set(fixture.id, password);
        await ensureUser(tx as PrismaClient, fixture, await bcrypt.hash(password, 12));
      }
    });

    const auth = new LocalAuthService(prisma as any);
    const reflector = { getAllAndOverride: () => false } as any;
    const authGuard = new AuthGuard(reflector, prisma as any);
    let anonymousDenied = false;
    try {
      await authGuard.canActivate(makeContext({ headers: {} }));
    } catch {
      anonymousDenied = true;
    }
    if (!anonymousDenied) throw new Error('Anonymous access unexpectedly passed AuthGuard.');
    for (const fixture of fixtures) {
      const session = await auth.login(fixture.email, passwords.get(fixture.id)!);
      const req = { headers: { authorization: `Bearer ${session.token}` } };
      await authGuard.canActivate(makeContext(req));
      if (req['user']?.userId !== fixture.id || req['user']?.role !== fixture.role) {
        throw new Error(`Database-backed login returned an unexpected identity for ${fixture.id}.`);
      }
    }

    const profileService = new UatTestProfilesService(prisma as any, auth as any);
    const switched = await profileService.startProfile(
      'phdk-uat-superadmin',
      'phdk-uat-coordinator',
      { ipAddress: '127.0.0.1', userAgent: 'phdk-uat-prep' },
    );
    const switchedReq = { headers: { authorization: `Bearer ${switched.token}` } };
    await authGuard.canActivate(makeContext(switchedReq));
    if (switchedReq['user']?.role !== 'coordinator' || switchedReq['user']?.uatActorUserId !== 'phdk-uat-superadmin') {
      throw new Error('Test as did not establish the audited reduced-privilege context.');
    }
    await profileService.endProfileSession(
      'phdk-uat-superadmin',
      switched.sessionId,
      { ipAddress: '127.0.0.1', userAgent: 'phdk-uat-prep' },
    );
    let revoked = false;
    try {
      await authGuard.canActivate(makeContext({ headers: { authorization: `Bearer ${switched.token}` } }));
    } catch {
      revoked = true;
    }
    if (!revoked) throw new Error('Returned Test as session remained usable.');
    const expiredToken = auth.generateUatTestProfileToken({
      userId: 'phdk-uat-coordinator',
      email: 'uat-coordinator@companyco.example.invalid',
      role: 'coordinator',
      sessionId: 'phdk-uat-expired-session',
      actorUserId: 'phdk-uat-superadmin',
      expiresAt: Date.now() - 1,
    });
    let expiredDenied = false;
    try {
      await authGuard.canActivate(makeContext({ headers: { authorization: `Bearer ${expiredToken}` } }));
    } catch {
      expiredDenied = true;
    }
    if (!expiredDenied) throw new Error('Expired Test as session unexpectedly passed AuthGuard.');

    const crudGuard = new CrudAccessGuard(prisma as any);
    const runGuard = async (userId: string, method: string, path: string, params: any, body: any, handler = 'operation') => {
      const req = { user: { userId }, method, path, route: { path }, params, body };
      await crudGuard.canActivate(makeContext({ ...req, handler }));
    };
    await runGuard('phdk-uat-admin', 'GET', '/api/crud/interfaces', {}, {});
    await runGuard('phdk-uat-coordinator', 'GET', '/api/crud/interfaces', {}, {});
    for (const manager of ['phdk-uat-admin', 'phdk-uat-coordinator']) {
      await runGuard(manager, 'PUT', '/api/crud/teams/:id/interfaces', { id: teamIds.companyCo }, { interfaceIds: [interfaceIds.companyCo] }, 'setTeamInterfaces');
      let denied = false;
      try {
        await runGuard(manager, 'PUT', '/api/crud/teams/:id/interfaces', { id: teamIds.companyCo }, { interfaceIds: [interfaceIds.otherCo] }, 'setTeamInterfaces');
      } catch {
        denied = true;
      }
      if (!denied) throw new Error('Cross-tenant interface assignment was not denied.');
    }
    let agentDenied = false;
    try {
      await runGuard('phdk-uat-agent', 'GET', '/api/crud/interfaces', {}, {});
    } catch {
      agentDenied = true;
    }
    if (!agentDenied) throw new Error('Agent unexpectedly received catalog access.');

    return {
      fixtureIds: fixtures.map(({ id, email, role, companyId, teamId }) => ({ id, email, role, companyId, teamId })),
      companyIds,
      brandIds,
      teamIds,
      interfaceIds,
      testCounts: { databaseLogins: fixtures.length, anonymousDenied: 1, tenantCatalogAllowed: 2, sameTenantAssignmentAllowed: 2, crossTenantAssignmentDenied: 2, lowRoleCatalogDenied: 1, profileSwitchReturnRevocationAndExpiry: 1 },
      cleanupCommand: 'npm run uat:prep:cleanup',
    };
  } finally {
    passwords.clear();
    await prisma.$disconnect();
  }
}

async function cleanup() {
  validateUatPrepTarget();
  const prisma = new PrismaClient();
  try {
    await prisma.$transaction(async (tx) => {
      const ids = fixtures.map(({ id }) => id);
      for (const [companyId, name] of [
        [companyIds.companyCo, 'Company Co'],
        [companyIds.otherCo, 'Other Co'],
      ] as const) {
        const company = await tx.company.findUnique({ where: { id: companyId } });
        if (company) assertOwned(company, { name: `PHDK UAT ${name}`, industry: 'coffee shop' }, 'company');
        const suffix = companyId === companyIds.companyCo ? 'Company Co' : 'Other Co';
        const brandId = companyId === companyIds.companyCo ? brandIds.companyCo : brandIds.otherCo;
        const teamId = companyId === companyIds.companyCo ? teamIds.companyCo : teamIds.otherCo;
        const interfaceId = companyId === companyIds.companyCo ? interfaceIds.companyCo : interfaceIds.otherCo;
        const brand = await tx.brand.findUnique({ where: { id: brandId } });
        if (brand) assertOwned(brand, { companyId, name: `PHDK UAT ${suffix} Brand` }, 'brand');
        const team = await tx.team.findUnique({ where: { id: teamId } });
        if (team) assertOwned(team, { brandId, name: `PHDK UAT ${suffix} Team` }, 'team');
        const managedInterface = await tx.managedInterface.findUnique({ where: { id: interfaceId } });
        if (managedInterface) assertOwned(managedInterface, { companyId, name: `PHDK UAT ${suffix} Mock CRM`, providerKey: 'phdk-uat-mock' }, 'interface');
      }
      for (const fixture of fixtures) {
        const user = await tx.user.findUnique({ where: { id: fixture.id } });
        if (user) {
          assertOwned(user, {
            email: fixture.email,
            name: fixture.name,
            role: fixture.role,
            companyId: fixture.companyId,
            teamId: fixture.teamId,
          }, 'user');
        }
      }
      await tx.user.deleteMany({ where: { id: { in: ids } } });
      await tx.company.deleteMany({ where: { id: { in: Object.values(companyIds) } } });
    });
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  const operation = process.argv[2] || 'prepare';
  const task = operation === '--cleanup' ? cleanup() : operation === 'prepare' ? provisionAndVerify() : Promise.reject(new Error('Usage: ts-node scripts/uat-prep-companyco.ts [prepare|--cleanup]'));
  task.then((result) => {
    if (result) console.log(JSON.stringify(result, null, 2));
    else console.log('PHDK UAT fixtures cleaned from the dedicated local database.');
  }).catch((error) => {
    console.error(`PHDK UAT Prep failed safely: ${error.message}`);
    process.exitCode = 1;
  });
}
