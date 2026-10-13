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

export interface StoreData {
  interfaces: ManagedInterface[];
  flowDefinitions: FlowDefinition[];
  flowVersions: FlowVersion[];
  tenantFlowPermissions: TenantFlowPermission[];
  intentFlowMappings: IntentFlowMapping[];
  knowledgeDocuments: KnowledgeDocument[];
  ttsConfig: TTSConfigEntry;
}

export interface TTSConfigEntry {
  providerId: string;
  apiKey: string;
  voiceId?: string;
  kokoroApiUrl?: string;
  updatedAt: string;
}

export interface ProviderCatalogEntry {
  id: string;
  type: 'stt' | 'tts' | 'rpa' | 'cloud';
  name: string;
  description: string;
  status: 'production' | 'experimental' | 'deprecated';
  is_enabled: boolean;
  metadata: Record<string, any>;
}
