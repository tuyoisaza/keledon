import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs/promises';
import * as path from 'path';

const prisma = new PrismaClient();
const dataDir = path.resolve(__dirname, '..', 'data');

type InterfaceSeed = {
  id: string;
  name: string;
  baseUrl: string;
  icon?: string;
  status?: string;
};

type WorkflowSeed = {
  id: string;
  name: string;
  description?: string;
  trigger: { type: string; value: string; confidence?: number };
  interfaceId?: string;
  steps: Array<Record<string, unknown>>;
  variables?: Record<string, unknown>;
  isEnabled?: boolean;
};

const companies = [
  { id: 'company-pepsico', name: 'PepsiCo', industry: 'Food & Beverage' },
  { id: 'company-stellantis', name: 'Stellantis', industry: 'Automotive' },
] as const;

const companyCountries = ['US', 'MX'] as const;

const brands = [
  { id: 'brand-cheetos', companyId: 'company-pepsico', name: 'Cheetos', color: '#FF6B00' },
  { id: 'brand-jeep', companyId: 'company-stellantis', name: 'Jeep', color: '#111111' },
] as const;

const teams = [
  {
    id: 'team-pepsico-us',
    brandId: 'brand-cheetos',
    name: 'PepsiCo US',
    country: 'US',
    sttProvider: 'deepgram',
    ttsProvider: 'elevenlabs',
  },
  {
    id: 'team-pepsico-mx',
    brandId: 'brand-cheetos',
    name: 'PepsiCo Mexico',
    country: 'MX',
    sttProvider: 'deepgram',
    ttsProvider: 'elevenlabs',
  },
  {
    id: 'team-stellantis-us',
    brandId: 'brand-jeep',
    name: 'Stellantis US',
    country: 'US',
    sttProvider: 'deepgram',
    ttsProvider: 'elevenlabs',
  },
  {
    id: 'team-stellantis-mx',
    brandId: 'brand-jeep',
    name: 'Stellantis Mexico',
    country: 'MX',
    sttProvider: 'deepgram',
    ttsProvider: 'elevenlabs',
  },
] as const;

const providerCatalogDefaults = [
  {
    id: 'provider-deepgram',
    type: 'stt',
    name: 'deepgram',
    description: 'Low-latency streaming speech-to-text',
    status: 'production',
    isEnabled: true,
    metadata: JSON.stringify({ keyEnv: 'DEEPGRAM_API_KEY', model: 'nova-2' }),
  },
  {
    id: 'provider-elevenlabs',
    type: 'tts',
    name: 'elevenlabs',
    description: 'Production text-to-speech provider',
    status: 'production',
    isEnabled: true,
    metadata: JSON.stringify({ keyEnv: 'ELEVENLABS_API_KEY', model: 'eleven_multilingual_v2' }),
  },
  {
    id: 'provider-browser-rpa',
    type: 'rpa',
    name: 'browser-rpa',
    description: 'Browser-based RPA execution for managed interfaces',
    status: 'production',
    isEnabled: true,
    metadata: JSON.stringify({ executionMode: 'browser', supportsManagedInterfaces: true }),
  },
] as const;

const teamVendorTemplates = [
  {
    slug: 'salesforce',
    name: 'Salesforce',
    type: 'crm',
    baseUrl: 'https://api.salesforce.com',
    config: { environment: 'production', interfaceId: 'iface-salesforce' },
  },
  {
    slug: 'genesys',
    name: 'Genesys Cloud',
    type: 'telephony',
    baseUrl: 'https://api.genesys.cloud',
    config: { environment: 'production', interfaceId: 'iface-genesys' },
  },
  {
    slug: 'avaya',
    name: 'Avaya OneCloud',
    type: 'telephony',
    baseUrl: 'https://api.avaya.com',
    config: { environment: 'production', interfaceId: 'iface-avaya' },
  },
] as const;

const featureFlags = [
  'phase_3_design',
  'rpa_flow_builder',
  'call_monitoring_dashboard',
  'qdrant_management',
] as const;

async function readJsonFile<T>(filename: string): Promise<T> {
  const filePath = path.join(dataDir, filename);
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw) as T;
}

async function seedCompanies() {
  for (const company of companies) {
    await prisma.company.upsert({
      where: { id: company.id },
      update: {
        name: company.name,
        industry: company.industry,
      },
      create: company,
    });

    for (const countryCode of companyCountries) {
      await prisma.companyCountry.upsert({
        where: {
          companyId_countryCode: { companyId: company.id, countryCode },
        },
        update: {},
        create: { companyId: company.id, countryCode },
      });
    }
  }
}

async function seedBrandsAndTeams() {
  for (const brand of brands) {
    await prisma.brand.upsert({
      where: { id: brand.id },
      update: {
        companyId: brand.companyId,
        name: brand.name,
        color: brand.color,
      },
      create: brand,
    });
  }

  for (const team of teams) {
    await prisma.team.upsert({
      where: { id: team.id },
      update: {
        brandId: team.brandId,
        name: team.name,
        country: team.country,
        sttProvider: team.sttProvider,
        ttsProvider: team.ttsProvider,
      },
      create: team,
    });
  }
}

async function seedUsers() {
  const adminPassword = process.env.KELEDON_SEED_ADMIN_PASSWORD;
  const demoPassword = process.env.KELEDON_SEED_DEMO_PASSWORD;
  const users = [
    {
      email: 'admin@keledon.com',
      name: 'KELEDON Admin',
      role: 'admin',
      companyId: 'company-pepsico',
      teamId: 'team-pepsico-us',
      password: adminPassword,
    },
    {
      email: 'demo@keledon.com',
      name: 'KELEDON Demo',
      role: 'user',
      companyId: 'company-stellantis',
      teamId: 'team-stellantis-us',
      password: demoPassword,
    },
  ];

  for (const user of users) {
    if (!user.password) {
      console.log(`[seed-operational] Skipping ${user.email}; no seed password env var provided.`);
      continue;
    }

    const passwordHash = await bcrypt.hash(user.password, 10);
    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        role: user.role,
        companyId: user.companyId,
        teamId: user.teamId,
      },
      create: {
        email: user.email,
        name: user.name,
        role: user.role,
        companyId: user.companyId,
        teamId: user.teamId,
        passwordHash,
      },
    });
  }
}

async function seedDefaultKeledon() {
  await prisma.keledon.upsert({
    where: { id: 'keledon-default-agent' },
    update: {
      name: 'Keledon Agent',
      email: 'agent@keledon.com',
      role: 'agent',
      teamId: 'team-pepsico-us',
      brandId: 'brand-cheetos',
      countryCode: 'US',
      autonomyLevel: 5,
      isActive: true,
      uiInterfaces: JSON.stringify(['iface-salesforce', 'iface-genesys', 'iface-avaya']),
    },
    create: {
      id: 'keledon-default-agent',
      name: 'Keledon Agent',
      email: 'agent@keledon.com',
      role: 'agent',
      teamId: 'team-pepsico-us',
      brandId: 'brand-cheetos',
      countryCode: 'US',
      autonomyLevel: 5,
      isActive: true,
      uiInterfaces: JSON.stringify(['iface-salesforce', 'iface-genesys', 'iface-avaya']),
    },
  });
}

async function seedInterfaces() {
  const interfaces = await readJsonFile<InterfaceSeed[]>('interfaces.json');

  for (const item of interfaces) {
    const providerKey =
      item.id === 'iface-salesforce' ? 'salesforce' : item.id === 'iface-genesys' ? 'genesys' : 'avaya';
    const category = item.id === 'iface-salesforce' ? 'case' : 'talk';
    const capabilities =
      category === 'case'
        ? { stt: false, tts: false, rpa: true }
        : { stt: true, tts: true, rpa: false };

    await prisma.managedInterface.upsert({
      where: { id: item.id },
      update: {
        name: item.name,
        baseUrl: item.baseUrl,
        icon: item.icon,
        status: item.status ?? 'connected',
        providerKey,
        category,
        capabilities: JSON.stringify(capabilities),
      },
      create: {
        id: item.id,
        name: item.name,
        baseUrl: item.baseUrl,
        icon: item.icon,
        status: item.status ?? 'connected',
        providerKey,
        category,
        capabilities: JSON.stringify(capabilities),
      },
    });
  }
}

async function seedTeamInterfacesAndVendors() {
  const interfaceIds = ['iface-salesforce', 'iface-genesys', 'iface-avaya'];

  for (const team of teams) {
    for (const interfaceId of interfaceIds) {
      await prisma.teamInterface.upsert({
        where: { teamId_interfaceId: { teamId: team.id, interfaceId } },
        update: {},
        create: { teamId: team.id, interfaceId },
      });
    }

    for (const template of teamVendorTemplates) {
      await prisma.vendor.upsert({
        where: { id: `vendor-${team.id}-${template.slug}` },
        update: {
          teamId: team.id,
          name: template.name,
          type: template.type,
          baseUrl: template.baseUrl,
          isActive: true,
          config: {
            ...template.config,
            teamId: team.id,
            country: team.country,
          },
        },
        create: {
          id: `vendor-${team.id}-${template.slug}`,
          teamId: team.id,
          name: template.name,
          type: template.type,
          baseUrl: template.baseUrl,
          isActive: true,
          config: {
            ...template.config,
            teamId: team.id,
            country: team.country,
          },
        },
      });
    }
  }
}

async function seedWorkflows() {
  const workflows = await readJsonFile<WorkflowSeed[]>('workflows.json');

  for (const workflow of workflows) {
    await prisma.workflow.upsert({
      where: { id: workflow.id },
      update: {
        interfaceId: workflow.interfaceId,
        name: workflow.name,
        description: workflow.description,
        trigger: JSON.stringify(workflow.trigger),
        steps: JSON.stringify(workflow.steps),
        variables: JSON.stringify(workflow.variables ?? {}),
        isEnabled: workflow.isEnabled ?? true,
      },
      create: {
        id: workflow.id,
        interfaceId: workflow.interfaceId,
        name: workflow.name,
        description: workflow.description,
        trigger: JSON.stringify(workflow.trigger),
        steps: JSON.stringify(workflow.steps),
        variables: JSON.stringify(workflow.variables ?? {}),
        isEnabled: workflow.isEnabled ?? true,
      },
    });

    const flowId = `flow-${workflow.id}`;
    const tool =
      workflow.interfaceId === 'iface-salesforce'
        ? 'salesforce'
        : workflow.interfaceId === 'iface-genesys'
          ? 'genesys'
          : 'browser';
    const category =
      workflow.interfaceId === 'iface-salesforce'
        ? 'crm'
        : workflow.interfaceId === 'iface-genesys'
          ? 'support'
          : 'general';

    await prisma.flow.upsert({
      where: { id: flowId },
      update: {
        name: workflow.name,
        description: workflow.description,
        triggerKeywords: JSON.stringify([workflow.trigger.value, workflow.name]),
        category,
        tool,
        isActive: workflow.isEnabled ?? true,
        createdBy: 'seed-operational-data',
      },
      create: {
        id: flowId,
        name: workflow.name,
        description: workflow.description,
        triggerKeywords: JSON.stringify([workflow.trigger.value, workflow.name]),
        category,
        tool,
        isActive: workflow.isEnabled ?? true,
        createdBy: 'seed-operational-data',
      },
    });

    const existingCount = await prisma.flowStep.count({ where: { flowId } });
    if (existingCount >= workflow.steps.length) {
      continue;
    }

    for (let index = 0; index < workflow.steps.length; index += 1) {
      const step = workflow.steps[index];
      const stepId = `flowstep-${workflow.id}-${index + 1}`;
      const stepType = String(step.type ?? 'navigate');
      const selector = typeof step.selector === 'string' ? step.selector : null;
      const value =
        typeof step.value === 'string'
          ? step.value
          : typeof step.url === 'string'
            ? step.url
            : typeof step.speakTemplate === 'string'
              ? step.speakTemplate
              : null;
      const extract = typeof step.variable === 'string' ? step.variable : null;
      const waitFor = typeof step.waitFor === 'string' ? step.waitFor : null;
      const timeout = typeof step.waitMs === 'number' ? step.waitMs : 10000;

      await prisma.flowStep.upsert({
        where: { id: stepId },
        update: {
          flowId,
          order: index + 1,
          type: stepType === 'type' ? 'input' : stepType,
          selector,
          value,
          extract,
          waitFor,
          timeout,
        },
        create: {
          id: stepId,
          flowId,
          order: index + 1,
          type: stepType === 'type' ? 'input' : stepType,
          selector,
          value,
          extract,
          waitFor,
          timeout,
        },
      });
    }
  }
}

async function seedProvidersAndTenantConfigs() {
  for (const provider of providerCatalogDefaults) {
    await prisma.providerCatalog.upsert({
      where: { id: provider.id },
      update: {
        type: provider.type,
        name: provider.name,
        description: provider.description,
        status: provider.status,
        isEnabled: provider.isEnabled,
        metadata: provider.metadata,
      },
      create: provider,
    });
  }

  for (const company of companies) {
    const entries = [
      { providerId: 'provider-deepgram', providerType: 'stt', isDefault: true },
      { providerId: 'provider-elevenlabs', providerType: 'tts', isDefault: true },
      { providerId: 'provider-browser-rpa', providerType: 'rpa', isDefault: true },
    ];

    for (const entry of entries) {
      await prisma.tenantProviderConfig.upsert({
        where: {
          companyId_providerId: {
            companyId: company.id,
            providerId: entry.providerId,
          },
        },
        update: {
          providerType: entry.providerType,
          isEnabled: true,
          isDefault: entry.isDefault,
          limits: JSON.stringify({ seededBy: 'seed-operational-data' }),
        },
        create: {
          companyId: company.id,
          providerId: entry.providerId,
          providerType: entry.providerType,
          isEnabled: true,
          isDefault: entry.isDefault,
          limits: JSON.stringify({ seededBy: 'seed-operational-data' }),
        },
      });
    }
  }
}

async function seedFeatureFlags() {
  for (const name of featureFlags) {
    await prisma.featureFlag.upsert({
      where: { name },
      update: {
        enabled: true,
        scope: 'global',
        metadata: JSON.stringify({ seededBy: 'seed-operational-data' }),
      },
      create: {
        name,
        enabled: true,
        scope: 'global',
        metadata: JSON.stringify({ seededBy: 'seed-operational-data' }),
      },
    });
  }
}

async function main() {
  console.log('[seed-operational] Starting additive operational reseed');
  await seedCompanies();
  await seedBrandsAndTeams();
  await seedUsers();
  await seedDefaultKeledon();
  await seedInterfaces();
  await seedTeamInterfacesAndVendors();
  await seedWorkflows();
  await seedProvidersAndTenantConfigs();
  await seedFeatureFlags();
  console.log('[seed-operational] Completed successfully');
}

main()
  .catch((error) => {
    console.error('[seed-operational] Failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
