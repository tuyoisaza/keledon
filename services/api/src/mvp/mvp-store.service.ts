import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { getProviderCatalog as buildProviderCatalog } from './provider-catalog';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import type {
  StoreData,
  ManagedInterface,
  FlowDefinition,
  FlowVersion,
  TenantFlowPermission,
  IntentFlowMapping,
  KnowledgeDocument,
  TTSConfigEntry,
  ProviderCatalogEntry,
  ManagedInterfaceInput,
  FlowDefinitionInput,
  FlowVersionInput,
  FlowVersionUpdateInput,
  TenantFlowPermissionInput,
  IntentFlowMappingInput,
  KnowledgeDocumentInput,
} from './mvp-store.types';
import {
  validateFlowDefinitionInput,
  validateFlowVersionInput,
  validateFlowVersionUpdateInput,
  validateIntentFlowMappingInput,
  validateKnowledgeDocumentInput,
  validateManagedInterfaceInput,
  validateTenantFlowPermissionInputs,
} from './mvp-store-write-validation';
export type {
  ManagedInterface,
  FlowDefinition,
  FlowVersion,
  TenantFlowPermission,
  IntentFlowMapping,
  KnowledgeDocument,
  TTSConfigEntry,
  ProviderCatalogEntry,
} from './mvp-store.types';

@Injectable()
export class MvpStoreService {
  private readonly dataDir: string;
  private readonly storePath: string;
  private store: StoreData;

  constructor() {
    this.dataDir = process.env.KELEDON_DATA_DIR || '/app/data';
    this.storePath = path.join(this.dataDir, 'mvp-store.json');
    this.ensureDataDir();
    this.store = this.loadStore();
  }

  getTechStatus() {
    const total = os.totalmem();
    const free = os.freemem();
    const used = total - free;

    return {
      server: {
        status: 'online' as const,
        uptime: process.uptime(),
        nodeVersion: process.version,
        memoryUsage: {
          used,
          total,
          percentage: total > 0 ? Number(((used / total) * 100).toFixed(2)) : 0,
        },
      },
      techStack: [
        { name: 'React', version: '19', category: 'frontend' as const },
        { name: 'NestJS', version: '11', category: 'backend' as const },
        { name: 'Socket.IO', version: '4', category: 'realtime' as const },
        { name: 'Prisma', version: '5', category: 'backend' as const },
        { name: 'SQLite', version: '3', category: 'backend' as const },
        { name: 'Qdrant', version: 'latest', category: 'other' as const },
      ],
      dependencies: [] as Array<Record<string, unknown>>,
    };
  }

  getProviderCatalog(localOnly = false): ProviderCatalogEntry[] {
    return buildProviderCatalog(localOnly);
  }

  getRpaProviders() {
    return [
      {
        id: 'testing-library-dom',
        name: 'Testing Library DOM',
        description:
          'Semantic element finding by accessible labels, roles, and text',
        requiresBackend: false,
        requiresApiKey: false,
      },
      {
        id: 'playwright-style',
        name: 'Playwright-Style Selectors',
        description:
          'Chained selectors, XPath, data-testid, text=, and role= syntax',
        requiresBackend: false,
        requiresApiKey: false,
      },
      {
        id: 'native-dom',
        name: 'Native DOM Automation',
        description: 'Browser APIs and DOM-native execution',
        requiresBackend: false,
        requiresApiKey: false,
      },
      {
        id: 'chrome-mv3',
        name: 'Chrome Extensions (MV3)',
        description: 'Manifest V3 extension automation',
        requiresBackend: false,
        requiresApiKey: false,
      },
      {
        id: 'playwright',
        name: 'Playwright',
        description: 'Cross-browser automation with Playwright',
        requiresBackend: true,
        requiresApiKey: false,
      },
    ];
  }

  getCloudConfig() {
    const cloudProvider = this.getProviderCatalog().find(
      (p) => p.id === 'cloud-brain',
    );
    return (
      cloudProvider?.metadata || {
        api_url:
          process.env.CLOUD_API_URL || 'https://keledonapi.tuyoisaza.com',
        ws_url: process.env.CLOUD_WS_URL || 'wss://keledonapi.tuyoisaza.com',
      }
    );
  }

  getTTSConfig(): TTSConfigEntry {
    return this.store.ttsConfig || this.defaultTTSConfig();
  }

  updateTTSConfig(input: Partial<TTSConfigEntry>): TTSConfigEntry {
    this.store.ttsConfig = {
      ...this.defaultTTSConfig(),
      ...this.store.ttsConfig,
      ...input,
      updatedAt: new Date().toISOString(),
    };
    this.saveStore();
    return this.store.ttsConfig;
  }

  getInterfaces(): ManagedInterface[] {
    return this.store.interfaces;
  }

  createInterface(input: ManagedInterfaceInput): ManagedInterface {
    validateManagedInterfaceInput(input);
    const now = new Date().toISOString();
    const iface: ManagedInterface = {
      id: randomUUID(),
      name: String(input.name || 'New Interface'),
      baseUrl: String(input.baseUrl || input.base_url || ''),
      base_url: String(input.baseUrl || input.base_url || ''),
      category: input.category || 'case',
      providerKey: input.providerKey,
      capabilities: input.capabilities || { rpa: true },
      status: input.status || 'connected',
      icon: input.icon,
      createdAt: now,
      updatedAt: now,
    };
    this.store.interfaces.push(iface);
    this.saveStore();
    return iface;
  }

  updateInterface(
    id: string,
    input: ManagedInterfaceInput,
  ): ManagedInterface | null {
    validateManagedInterfaceInput(input);
    const index = this.store.interfaces.findIndex((item) => item.id === id);
    if (index < 0) return null;
    const current = this.store.interfaces[index];
    const baseUrl = String(input.baseUrl || input.base_url || current.baseUrl);
    const updated: ManagedInterface = {
      ...current,
      name: input.name ?? current.name,
      baseUrl,
      base_url: baseUrl,
      category: input.category ?? current.category,
      providerKey: input.providerKey ?? current.providerKey,
      capabilities: input.capabilities ?? current.capabilities,
      status: input.status ?? current.status,
      icon: input.icon ?? current.icon,
      updatedAt: new Date().toISOString(),
    };
    this.store.interfaces[index] = updated;
    this.saveStore();
    return updated;
  }

  deleteInterface(id: string): boolean {
    const before = this.store.interfaces.length;
    this.store.interfaces = this.store.interfaces.filter(
      (item) => item.id !== id,
    );
    const changed = this.store.interfaces.length !== before;
    if (changed) this.saveStore();
    return changed;
  }

  getFlowDefinitions(companyId?: string): FlowDefinition[] {
    return this.store.flowDefinitions.filter((flow) =>
      companyId ? flow.companyId === companyId : true,
    );
  }

  createFlowDefinition(input: FlowDefinitionInput): FlowDefinition {
    validateFlowDefinitionInput(input);
    const companyId = String(input.companyId || '').trim();
    if (!companyId) throw new BadRequestException('Company scope is required');
    const now = new Date().toISOString();
    const flow: FlowDefinition = {
      id: randomUUID(),
      companyId,
      interfaceId: input.interfaceId,
      name: String(input.name || 'New Flow'),
      description: input.description,
      category: input.category || 'case',
      status: input.status || 'active',
      intentTags: Array.isArray(input.intentTags) ? input.intentTags : [],
      createdAt: now,
      updatedAt: now,
    };
    this.store.flowDefinitions.push(flow);
    this.saveStore();
    return flow;
  }

  updateFlowDefinition(
    id: string,
    input: FlowDefinitionInput,
    companyId?: string,
  ): FlowDefinition | null {
    validateFlowDefinitionInput(input);
    const index = this.store.flowDefinitions.findIndex(
      (flow) => flow.id === id && (!companyId || flow.companyId === companyId),
    );
    if (index < 0) return null;
    const current = this.store.flowDefinitions[index];
    const updated: FlowDefinition = {
      ...current,
      companyId: input.companyId ?? current.companyId,
      interfaceId: input.interfaceId ?? current.interfaceId,
      name: input.name ?? current.name,
      description: input.description ?? current.description,
      category: input.category ?? current.category,
      intentTags: input.intentTags ?? current.intentTags,
      status: input.status ?? current.status,
      updatedAt: new Date().toISOString(),
    };
    this.store.flowDefinitions[index] = updated;
    this.saveStore();
    return updated;
  }

  getFlowVersions(companyId?: string): FlowVersion[] {
    if (!companyId) return this.store.flowVersions;
    const ownedIds = new Set(
      this.store.flowDefinitions
        .filter((flow) => flow.companyId === companyId)
        .map((flow) => flow.id),
    );
    return this.store.flowVersions.filter((version) =>
      ownedIds.has(version.flowDefinitionId),
    );
  }

  createFlowVersion(
    input: FlowVersionInput,
    actorId: string,
    companyId?: string,
  ): FlowVersion {
    validateFlowVersionInput(input);
    if (typeof actorId !== 'string' || actorId.length === 0)
      throw new BadRequestException('Current actor is required');
    const definition = this.store.flowDefinitions.find(
      (flow) =>
        flow.id === input.flowDefinitionId &&
        (!companyId || flow.companyId === companyId),
    );
    if (!definition) throw new BadRequestException('Flow definition is unavailable');
    const version = Number(input.version || 1);
    if (
      this.store.flowVersions.some(
        (item) => item.flowDefinitionId === definition.id && item.version === version,
      )
    )
      throw new BadRequestException('Flow version already exists');
    const now = new Date().toISOString();
    const flowVersion: FlowVersion = {
      id: randomUUID(),
      flowDefinitionId: String(input.flowDefinitionId || ''),
      version,
      status: input.status || 'draft',
      steps: Array.isArray(input.steps) ? input.steps : [],
      createdBy: actorId,
      createdAt: now,
      updatedAt: now,
    };
    this.store.flowVersions.push(flowVersion);
    this.saveStore();
    return flowVersion;
  }

  updateFlowVersion(
    id: string,
    input: FlowVersionUpdateInput,
    companyId?: string,
  ): FlowVersion | null {
    validateFlowVersionUpdateInput(input);
    const index = this.store.flowVersions.findIndex((item) => item.id === id);
    if (index < 0) return null;
    const current = this.store.flowVersions[index];
    const definition = this.store.flowDefinitions.find(
      (flow) =>
        flow.id === current.flowDefinitionId &&
        (!companyId || flow.companyId === companyId),
    );
    if (!definition) return null;
    if (current.status !== 'draft')
      throw new BadRequestException('Only draft flow versions can be edited');
    if (
      input.version !== undefined &&
      this.store.flowVersions.some(
        (item) =>
          item.id !== id &&
          item.flowDefinitionId === current.flowDefinitionId &&
          item.version === input.version,
      )
    )
      throw new BadRequestException('Flow version already exists');
    const updated: FlowVersion = {
      ...this.store.flowVersions[index],
      version: input.version ?? this.store.flowVersions[index].version,
      status: input.status ?? this.store.flowVersions[index].status,
      steps: input.steps ?? this.store.flowVersions[index].steps,
      updatedAt: new Date().toISOString(),
    };
    this.store.flowVersions[index] = updated;
    this.saveStore();
    return updated;
  }

  getTenantFlowPermissions(companyId: string): TenantFlowPermission[] {
    return this.store.tenantFlowPermissions.filter(
      (item) => item.companyId === companyId,
    );
  }

  upsertTenantFlowPermissions(
    entries: TenantFlowPermissionInput[],
    scopeCompanyId?: string,
  ): TenantFlowPermission[] {
    entries = validateTenantFlowPermissionInputs(entries);
    const companyIdForScope = scopeCompanyId;
    if (
      entries.some((entry) => {
        const companyId = companyIdForScope || String(entry.companyId || '');
        const flowDefinitionId = String(entry.flowDefinitionId || '');
        return !this.store.flowDefinitions.some(
          (flow) => flow.id === flowDefinitionId && flow.companyId === companyId,
        );
      })
    )
      throw new BadRequestException('Flow definition is unavailable for this company');
    for (const entry of entries) {
      const companyId = scopeCompanyId || String(entry.companyId || '');
      const flowDefinitionId = String(entry.flowDefinitionId || '');

      const existing = this.store.tenantFlowPermissions.find(
        (item) =>
          item.companyId === companyId &&
          item.flowDefinitionId === flowDefinitionId,
      );

      if (existing) {
        existing.isEnabled = Boolean(entry.isEnabled);
        existing.defaultForIntent = entry.defaultForIntent;
        existing.updatedAt = new Date().toISOString();
      } else {
        const now = new Date().toISOString();
        this.store.tenantFlowPermissions.push({
          id: randomUUID(),
          companyId,
          flowDefinitionId,
          isEnabled: Boolean(entry.isEnabled),
          defaultForIntent: entry.defaultForIntent,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    this.saveStore();
    return this.store.tenantFlowPermissions.filter((item) =>
      scopeCompanyId ? item.companyId === scopeCompanyId : true,
    );
  }

  getIntentFlowMappings(companyId: string): IntentFlowMapping[] {
    return this.store.intentFlowMappings.filter(
      (item) => item.companyId === companyId,
    );
  }

  upsertIntentFlowMapping(
    entry: IntentFlowMappingInput,
    scopeCompanyId?: string,
  ): IntentFlowMapping {
    validateIntentFlowMappingInput(entry);
    const companyId = scopeCompanyId || String(entry.companyId || '');
    const intent = String(entry.intent || '').trim();
    const allowedFlowDefinitionIds = Array.isArray(
      entry.allowedFlowDefinitionIds,
    )
      ? entry.allowedFlowDefinitionIds
      : [];
    if (
      allowedFlowDefinitionIds.some(
        (id) =>
          !this.store.flowDefinitions.some(
            (flow) => flow.id === id && flow.companyId === companyId,
          ),
      )
    )
      throw new BadRequestException('Intent mapping contains a flow outside this company');

    const existing = this.store.intentFlowMappings.find(
      (item) => item.companyId === companyId && item.intent === intent,
    );

    if (existing) {
      existing.allowedFlowDefinitionIds = allowedFlowDefinitionIds;
      existing.updatedAt = new Date().toISOString();
      this.saveStore();
      return existing;
    }

    const now = new Date().toISOString();
    const mapping: IntentFlowMapping = {
      id: randomUUID(),
      companyId,
      intent,
      allowedFlowDefinitionIds,
      createdAt: now,
      updatedAt: now,
    };
    this.store.intentFlowMappings.push(mapping);
    this.saveStore();
    return mapping;
  }

  getKnowledgeDocuments(): KnowledgeDocument[] {
    return this.store.knowledgeDocuments;
  }

  createKnowledgeDocument(input: KnowledgeDocumentInput): KnowledgeDocument {
    validateKnowledgeDocumentInput(input);
    const now = new Date().toISOString();
    const content = String(input.content || '');
    const doc: KnowledgeDocument = {
      id: randomUUID(),
      title: String(input.title || 'Untitled Document'),
      content,
      type: input.type || 'text',
      status: 'indexed',
      chunk_count: Math.max(1, Math.ceil(content.length / 500)),
      size_bytes: Buffer.byteLength(content, 'utf-8'),
      created_at: now,
      updated_at: now,
    };
    this.store.knowledgeDocuments.unshift(doc);
    this.saveStore();
    return doc;
  }

  private ensureDataDir(): void {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  private loadStore(): StoreData {
    if (!fs.existsSync(this.storePath)) {
      const initial = this.defaultStore();
      fs.writeFileSync(
        this.storePath,
        JSON.stringify(initial, null, 2),
        'utf8',
      );
      return initial;
    }

    try {
      const raw = fs.readFileSync(this.storePath, 'utf8');
      const parsed = JSON.parse(raw);
      return {
        interfaces: Array.isArray(parsed.interfaces) ? parsed.interfaces : [],
        flowDefinitions: Array.isArray(parsed.flowDefinitions)
          ? parsed.flowDefinitions
          : [],
        flowVersions: Array.isArray(parsed.flowVersions)
          ? parsed.flowVersions
          : [],
        tenantFlowPermissions: Array.isArray(parsed.tenantFlowPermissions)
          ? parsed.tenantFlowPermissions
          : [],
        intentFlowMappings: Array.isArray(parsed.intentFlowMappings)
          ? parsed.intentFlowMappings
          : [],
        knowledgeDocuments: Array.isArray(parsed.knowledgeDocuments)
          ? parsed.knowledgeDocuments
          : [],
        ttsConfig: parsed.ttsConfig || this.defaultTTSConfig(),
      };
    } catch {
      const initial = this.defaultStore();
      fs.writeFileSync(
        this.storePath,
        JSON.stringify(initial, null, 2),
        'utf8',
      );
      return initial;
    }
  }

  private saveStore(): void {
    fs.writeFileSync(
      this.storePath,
      JSON.stringify(this.store, null, 2),
      'utf8',
    );
  }

  private defaultStore(): StoreData {
    const now = new Date().toISOString();
    return {
      interfaces: [
        {
          id: randomUUID(),
          name: 'Default Contact Center',
          baseUrl: 'https://apps.genesyscloud.com',
          base_url: 'https://apps.genesyscloud.com',
          category: 'talk',
          providerKey: 'genesys',
          capabilities: { stt: true, tts: true, rpa: true },
          status: 'connected',
          icon: 'phone',
          createdAt: now,
          updatedAt: now,
        },
      ],
      flowDefinitions: [],
      flowVersions: [],
      tenantFlowPermissions: [],
      intentFlowMappings: [],
      knowledgeDocuments: [],
      ttsConfig: this.defaultTTSConfig(),
    };
  }

  private defaultTTSConfig(): TTSConfigEntry {
    return {
      providerId: 'webspeech',
      apiKey: '',
      updatedAt: new Date().toISOString(),
    };
  }
}
