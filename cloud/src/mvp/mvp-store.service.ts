import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

export interface ManagedInterface {
  id: string;
  name: string;
  baseUrl: string;
  base_url: string;
  category: 'talk' | 'case';
  providerKey?: string;
  capabilities?: Record<string, boolean>;
  status: 'connected' | 'disconnected' | 'error';
  icon?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FlowDefinition {
  id: string;
  companyId?: string;
  interfaceId?: string;
  name: string;
  description?: string;
  category?: 'talk' | 'case';
  intentTags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface FlowVersion {
  id: string;
  flowDefinitionId: string;
  version: number;
  status: 'draft' | 'approved' | 'deprecated';
  steps: Array<Record<string, any>>;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TenantFlowPermission {
  id: string;
  companyId: string;
  flowDefinitionId: string;
  isEnabled: boolean;
  defaultForIntent?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IntentFlowMapping {
  id: string;
  companyId: string;
  intent: string;
  allowedFlowDefinitionIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeDocument {
  id: string;
  title: string;
  content: string;
  type: 'pdf' | 'docx' | 'url' | 'text';
  status: 'indexed' | 'indexing' | 'error';
  chunk_count: number;
  size_bytes: number;
  created_at: string;
  updated_at: string;
}

interface StoreData {
  interfaces: ManagedInterface[];
  flowDefinitions: FlowDefinition[];
  flowVersions: FlowVersion[];
  tenantFlowPermissions: TenantFlowPermission[];
  intentFlowMappings: IntentFlowMapping[];
  knowledgeDocuments: KnowledgeDocument[];
}

export interface ProviderCatalogEntry {
  id: string;
  type: 'stt' | 'tts' | 'rpa';
  name: string;
  description: string;
  status: 'production' | 'experimental' | 'deprecated';
  is_enabled: boolean;
  metadata: Record<string, any>;
}

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
      dependencies: [] as Array<Record<string, any>>,
    };
  }

  getProviderCatalog(localOnly = false): ProviderCatalogEntry[] {
    const providers: ProviderCatalogEntry[] = [
      {
        id: 'vosk',
        type: 'stt',
        name: 'VOSK',
        description: 'Local speech-to-text runtime',
        status: 'production',
        is_enabled: true,
        metadata: {
          endpoint: process.env.VOSK_SERVER_URL || 'wss://keledon.tuyoisaza.com/listen/ws',
          requires_api_key: false,
          auto_start: true,
        },
      },
      {
        id: 'deepgram',
        type: 'stt',
        name: 'Deepgram',
        description: 'Cloud speech-to-text provider',
        status: 'production',
        is_enabled: true,
        metadata: {
          requires_api_key: true,
          required_env: ['DEEPGRAM_API_KEY'],
        },
      },
      {
        id: 'elevenlabs',
        type: 'tts',
        name: 'ElevenLabs',
        description: 'Cloud text-to-speech provider',
        status: 'production',
        is_enabled: true,
        metadata: {
          requires_api_key: true,
          required_env: ['ELEVENLABS_API_KEY'],
        },
      },
      {
        id: 'webspeech',
        type: 'tts',
        name: 'Web Speech API',
        description: 'Browser-native TTS fallback',
        status: 'production',
        is_enabled: true,
        metadata: {
          requires_api_key: false,
        },
      },
      {
        id: 'native-dom',
        type: 'rpa',
        name: 'Native DOM Automation',
        description: 'Browser API deterministic actions',
        status: 'production',
        is_enabled: true,
        metadata: {
          requires_api_key: false,
          auto_start: true,
        },
      },
      {
        id: 'playwright',
        type: 'rpa',
        name: 'Playwright',
        description: 'Server-side browser automation',
        status: 'experimental',
        is_enabled: true,
        metadata: {
          requires_api_key: false,
        },
      },
    ];

    if (!localOnly) {
      return providers;
    }

    return providers.filter((provider) => {
      const metadata = provider.metadata || {};
      if (!metadata.requires_api_key) return true;
      const requiredEnv = Array.isArray(metadata.required_env) ? metadata.required_env : [];
      return requiredEnv.every((envName: string) => Boolean(process.env[envName]));
    });
  }

  getRpaProviders() {
    return [
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

  getInterfaces(): ManagedInterface[] {
    return this.store.interfaces;
  }

  createInterface(input: Partial<ManagedInterface>): ManagedInterface {
    const now = new Date().toISOString();
    const iface: ManagedInterface = {
      id: randomUUID(),
      name: String(input.name || 'New Interface'),
      baseUrl: String(input.baseUrl || input.base_url || ''),
      base_url: String(input.baseUrl || input.base_url || ''),
      category: (input.category as 'talk' | 'case') || 'case',
      providerKey: input.providerKey,
      capabilities: input.capabilities || { rpa: true },
      status: (input.status as 'connected' | 'disconnected' | 'error') || 'connected',
      icon: input.icon,
      createdAt: now,
      updatedAt: now,
    };
    this.store.interfaces.push(iface);
    this.saveStore();
    return iface;
  }

  updateInterface(id: string, input: Partial<ManagedInterface>): ManagedInterface | null {
    const index = this.store.interfaces.findIndex((item) => item.id === id);
    if (index < 0) return null;
    const current = this.store.interfaces[index];
    const baseUrl = String(input.baseUrl || input.base_url || current.baseUrl);
    const updated: ManagedInterface = {
      ...current,
      ...input,
      baseUrl,
      base_url: baseUrl,
      updatedAt: new Date().toISOString(),
    };
    this.store.interfaces[index] = updated;
    this.saveStore();
    return updated;
  }

  deleteInterface(id: string): boolean {
    const before = this.store.interfaces.length;
    this.store.interfaces = this.store.interfaces.filter((item) => item.id !== id);
    const changed = this.store.interfaces.length !== before;
    if (changed) this.saveStore();
    return changed;
  }

  getFlowDefinitions(): FlowDefinition[] {
    return this.store.flowDefinitions;
  }

  createFlowDefinition(input: Partial<FlowDefinition>): FlowDefinition {
    const now = new Date().toISOString();
    const flow: FlowDefinition = {
      id: randomUUID(),
      companyId: input.companyId,
      interfaceId: input.interfaceId,
      name: String(input.name || 'New Flow'),
      description: input.description,
      category: (input.category as 'talk' | 'case') || 'case',
      intentTags: Array.isArray(input.intentTags) ? input.intentTags : [],
      createdAt: now,
      updatedAt: now,
    };
    this.store.flowDefinitions.push(flow);
    this.saveStore();
    return flow;
  }

  getFlowVersions(): FlowVersion[] {
    return this.store.flowVersions;
  }

  createFlowVersion(input: Partial<FlowVersion>): FlowVersion {
    const now = new Date().toISOString();
    const flowVersion: FlowVersion = {
      id: randomUUID(),
      flowDefinitionId: String(input.flowDefinitionId || ''),
      version: Number(input.version || 1),
      status: (input.status as 'draft' | 'approved' | 'deprecated') || 'draft',
      steps: Array.isArray(input.steps) ? input.steps : [],
      createdBy: input.createdBy,
      createdAt: now,
      updatedAt: now,
    };
    this.store.flowVersions.push(flowVersion);
    this.saveStore();
    return flowVersion;
  }

  updateFlowVersion(id: string, input: Partial<FlowVersion>): FlowVersion | null {
    const index = this.store.flowVersions.findIndex((item) => item.id === id);
    if (index < 0) return null;
    const updated: FlowVersion = {
      ...this.store.flowVersions[index],
      ...input,
      updatedAt: new Date().toISOString(),
    };
    this.store.flowVersions[index] = updated;
    this.saveStore();
    return updated;
  }

  getTenantFlowPermissions(companyId: string): TenantFlowPermission[] {
    return this.store.tenantFlowPermissions.filter((item) => item.companyId === companyId);
  }

  upsertTenantFlowPermissions(entries: Array<Partial<TenantFlowPermission>>): TenantFlowPermission[] {
    for (const entry of entries) {
      const companyId = String(entry.companyId || '');
      const flowDefinitionId = String(entry.flowDefinitionId || '');
      if (!companyId || !flowDefinitionId) continue;

      const existing = this.store.tenantFlowPermissions.find(
        (item) => item.companyId === companyId && item.flowDefinitionId === flowDefinitionId,
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
    return this.store.tenantFlowPermissions;
  }

  getIntentFlowMappings(companyId: string): IntentFlowMapping[] {
    return this.store.intentFlowMappings.filter((item) => item.companyId === companyId);
  }

  upsertIntentFlowMapping(entry: Partial<IntentFlowMapping>): IntentFlowMapping {
    const companyId = String(entry.companyId || '');
    const intent = String(entry.intent || '').trim();
    const allowedFlowDefinitionIds = Array.isArray(entry.allowedFlowDefinitionIds)
      ? entry.allowedFlowDefinitionIds
      : [];

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

  createKnowledgeDocument(input: Partial<KnowledgeDocument>): KnowledgeDocument {
    const now = new Date().toISOString();
    const content = String(input.content || '');
    const doc: KnowledgeDocument = {
      id: randomUUID(),
      title: String(input.title || 'Untitled Document'),
      content,
      type: (input.type as 'pdf' | 'docx' | 'url' | 'text') || 'text',
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
      fs.writeFileSync(this.storePath, JSON.stringify(initial, null, 2), 'utf8');
      return initial;
    }

    try {
      const raw = fs.readFileSync(this.storePath, 'utf8');
      const parsed = JSON.parse(raw);
      return {
        interfaces: Array.isArray(parsed.interfaces) ? parsed.interfaces : [],
        flowDefinitions: Array.isArray(parsed.flowDefinitions) ? parsed.flowDefinitions : [],
        flowVersions: Array.isArray(parsed.flowVersions) ? parsed.flowVersions : [],
        tenantFlowPermissions: Array.isArray(parsed.tenantFlowPermissions) ? parsed.tenantFlowPermissions : [],
        intentFlowMappings: Array.isArray(parsed.intentFlowMappings) ? parsed.intentFlowMappings : [],
        knowledgeDocuments: Array.isArray(parsed.knowledgeDocuments) ? parsed.knowledgeDocuments : [],
      };
    } catch {
      const initial = this.defaultStore();
      fs.writeFileSync(this.storePath, JSON.stringify(initial, null, 2), 'utf8');
      return initial;
    }
  }

  private saveStore(): void {
    fs.writeFileSync(this.storePath, JSON.stringify(this.store, null, 2), 'utf8');
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
    };
  }
}
