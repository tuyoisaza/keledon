import { Injectable } from '@nestjs/common';
import { getProviderCatalog } from './provider-catalog';
import { randomUUID } from 'crypto';
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
  KnowledgeDocumentInput,
} from './mvp-store.types';
import {
  validateKnowledgeDocumentInput,
  validateManagedInterfaceInput,
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasStrings(
  value: Record<string, unknown>,
  ...keys: string[]
): boolean {
  return keys.every((key) => typeof value[key] === 'string');
}

function hasValue(value: unknown, options: readonly string[]): boolean {
  return typeof value === 'string' && options.includes(value);
}

function readEntries<T>(
  value: unknown,
  isEntry: (item: unknown) => item is T,
): T[] {
  return Array.isArray(value) ? value.filter(isEntry) : [];
}

function isManagedInterface(value: unknown): value is ManagedInterface {
  if (
    !isRecord(value) ||
    !hasStrings(
      value,
      'id',
      'name',
      'baseUrl',
      'base_url',
      'createdAt',
      'updatedAt',
    )
  )
    return false;
  return (
    hasValue(value.category, ['talk', 'case']) &&
    hasValue(value.status, ['connected', 'disconnected', 'error'])
  );
}

function isFlowDefinition(value: unknown): value is FlowDefinition {
  return (
    isRecord(value) &&
    hasStrings(value, 'id', 'name', 'createdAt', 'updatedAt') &&
    Array.isArray(value.intentTags) &&
    value.intentTags.every((tag) => typeof tag === 'string')
  );
}

function isFlowVersion(value: unknown): value is FlowVersion {
  return (
    isRecord(value) &&
    hasStrings(value, 'id', 'flowDefinitionId', 'createdAt', 'updatedAt') &&
    typeof value.version === 'number' &&
    hasValue(value.status, ['draft', 'approved', 'deprecated']) &&
    Array.isArray(value.steps)
  );
}

function isTenantFlowPermission(value: unknown): value is TenantFlowPermission {
  return (
    isRecord(value) &&
    hasStrings(
      value,
      'id',
      'companyId',
      'flowDefinitionId',
      'createdAt',
      'updatedAt',
    ) &&
    typeof value.isEnabled === 'boolean'
  );
}

function isIntentFlowMapping(value: unknown): value is IntentFlowMapping {
  return (
    isRecord(value) &&
    hasStrings(value, 'id', 'companyId', 'intent', 'createdAt', 'updatedAt') &&
    Array.isArray(value.allowedFlowDefinitionIds) &&
    value.allowedFlowDefinitionIds.every((id) => typeof id === 'string')
  );
}

function isKnowledgeDocument(value: unknown): value is KnowledgeDocument {
  return (
    isRecord(value) &&
    hasStrings(value, 'id', 'title', 'content', 'created_at', 'updated_at') &&
    hasValue(value.type, ['pdf', 'docx', 'url', 'text']) &&
    hasValue(value.status, ['indexed', 'indexing', 'error']) &&
    typeof value.chunk_count === 'number' &&
    typeof value.size_bytes === 'number'
  );
}

function isTTSConfig(value: unknown): value is TTSConfigEntry {
  return (
    isRecord(value) && hasStrings(value, 'providerId', 'apiKey', 'updatedAt')
  );
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
      dependencies: [] as Array<Record<string, unknown>>,
    };
  }

  getProviderCatalog(localOnly = false): ProviderCatalogEntry[] {
    return getProviderCatalog(localOnly);
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
      const parsed: unknown = JSON.parse(raw);
      if (!isRecord(parsed)) throw new Error('Invalid MVP store structure');
      return {
        interfaces: readEntries(parsed.interfaces, isManagedInterface),
        flowDefinitions: readEntries(parsed.flowDefinitions, isFlowDefinition),
        flowVersions: readEntries(parsed.flowVersions, isFlowVersion),
        tenantFlowPermissions: readEntries(
          parsed.tenantFlowPermissions,
          isTenantFlowPermission,
        ),
        intentFlowMappings: readEntries(
          parsed.intentFlowMappings,
          isIntentFlowMapping,
        ),
        knowledgeDocuments: readEntries(
          parsed.knowledgeDocuments,
          isKnowledgeDocument,
        ),
        ttsConfig: isTTSConfig(parsed.ttsConfig)
          ? parsed.ttsConfig
          : this.defaultTTSConfig(),
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
