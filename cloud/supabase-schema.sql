-- Supabase Database Schema for Keldon
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor)

-- ========================================
-- COMPANIES (Top-level organization)
-- ========================================
CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    industry TEXT,
    agent_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- BRANDS (Belongs to Company)
-- ========================================
CREATE TABLE IF NOT EXISTS brands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- TEAMS (Belongs to Brand)
-- ========================================
CREATE TABLE IF NOT EXISTS teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    member_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- USERS (System users with roles)
-- ========================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
    team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'agent', 'admin', 'coordinator', 'superadmin')),
    is_online BOOLEAN DEFAULT false,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- AGENTS (Belongs to Team)
-- ========================================
CREATE TABLE IF NOT EXISTS agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    email TEXT,
    role TEXT,
    is_active BOOLEAN DEFAULT true,
    calls_handled INT DEFAULT 0,
    fcr_rate FLOAT DEFAULT 0,
    avg_handle_time INT DEFAULT 0,
    autonomy_level INT DEFAULT 1,
    policies JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- MANAGED INTERFACES (External connections)
-- ========================================
CREATE TABLE IF NOT EXISTS managed_interfaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    base_url TEXT NOT NULL,
    icon TEXT,
    category TEXT DEFAULT 'case' CHECK (category IN ('talk', 'case')),
    provider_key TEXT,
    capabilities JSONB DEFAULT '{}',
    status TEXT DEFAULT 'disconnected' CHECK (status IN ('connected', 'disconnected', 'error')),
    credentials JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE managed_interfaces ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'case';
ALTER TABLE managed_interfaces ADD COLUMN IF NOT EXISTS provider_key TEXT;
ALTER TABLE managed_interfaces ADD COLUMN IF NOT EXISTS capabilities JSONB DEFAULT '{}';

-- ========================================
-- SESSIONS (Call/Interaction History)
-- ========================================
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    caller_id TEXT,
    status TEXT CHECK (status IN ('active', 'completed', 'escalated')),
    intent TEXT,
    confidence FLOAT,
    duration INT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- WORKFLOWS (RPA automation flows)
-- ========================================
CREATE TABLE IF NOT EXISTS workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    interface_id UUID REFERENCES managed_interfaces(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT,
    trigger JSONB NOT NULL DEFAULT '{"type": "manual", "value": ""}',
    steps JSONB DEFAULT '[]',
    variables JSONB DEFAULT '{}',
    is_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- FLOW DEFINITIONS (Metadata)
-- ========================================
CREATE TABLE IF NOT EXISTS flow_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    interface_id UUID REFERENCES managed_interfaces(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    category TEXT DEFAULT 'case' CHECK (category IN ('talk', 'case')),
    intent_tags TEXT[] DEFAULT '{}',
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- FLOW VERSIONS (Approved deterministic steps)
-- ========================================
CREATE TABLE IF NOT EXISTS flow_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    flow_definition_id UUID REFERENCES flow_definitions(id) ON DELETE CASCADE,
    version INT NOT NULL,
    steps JSONB DEFAULT '[]',
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'deprecated')),
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (flow_definition_id, version)
);

-- ========================================
-- TENANT FLOW PERMISSIONS
-- ========================================
CREATE TABLE IF NOT EXISTS tenant_flow_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    flow_definition_id UUID REFERENCES flow_definitions(id) ON DELETE CASCADE,
    is_enabled BOOLEAN DEFAULT true,
    default_for_intent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (company_id, flow_definition_id)
);

-- ========================================
-- INTENT FLOW MAPPINGS (Allowlist)
-- ========================================
CREATE TABLE IF NOT EXISTS intent_flow_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    intent TEXT NOT NULL,
    allowed_flow_definition_ids UUID[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (company_id, intent)
);

-- ========================================
-- FLOW RUNS (Audit)
-- ========================================
CREATE TABLE IF NOT EXISTS flow_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    flow_version_id UUID REFERENCES flow_versions(id) ON DELETE SET NULL,
    session_id TEXT,
    company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'cancelled')),
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- ========================================
-- FLOW RUN EVIDENCE
-- ========================================
CREATE TABLE IF NOT EXISTS flow_run_evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    flow_run_id UUID REFERENCES flow_runs(id) ON DELETE CASCADE,
    step_index INT,
    action TEXT,
    selector TEXT,
    value TEXT,
    screenshot_hash TEXT,
    result TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- PROVIDER CATALOG (Global capabilities)
-- ========================================
CREATE TABLE IF NOT EXISTS provider_catalog (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('stt', 'tts', 'rpa')),
    name TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'experimental' CHECK (status IN ('experimental', 'production', 'deprecated')),
    is_enabled BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- TENANT PROVIDER CONFIG (Company-level)
-- ========================================
CREATE TABLE IF NOT EXISTS tenant_provider_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    provider_id TEXT REFERENCES provider_catalog(id) ON DELETE CASCADE,
    provider_type TEXT NOT NULL CHECK (provider_type IN ('stt', 'tts', 'rpa')),
    is_enabled BOOLEAN DEFAULT false,
    is_default BOOLEAN DEFAULT false,
    limits JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (company_id, provider_id)
);

-- ========================================
-- TENANT VOICE PROFILES
-- ========================================
CREATE TABLE IF NOT EXISTS tenant_voice_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    provider_id TEXT REFERENCES provider_catalog(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    language TEXT,
    is_enabled BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,
    config JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- INDEXES for performance
-- ========================================
CREATE INDEX IF NOT EXISTS idx_brands_company ON brands(company_id);
CREATE INDEX IF NOT EXISTS idx_teams_brand ON teams(brand_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_company ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_users_team ON users(team_id);
CREATE INDEX IF NOT EXISTS idx_agents_team ON agents(team_id);
CREATE INDEX IF NOT EXISTS idx_workflows_interface ON workflows(interface_id);
CREATE INDEX IF NOT EXISTS idx_workflows_enabled ON workflows(is_enabled) WHERE is_enabled = true;
CREATE INDEX IF NOT EXISTS idx_flow_defs_company ON flow_definitions(company_id);
CREATE INDEX IF NOT EXISTS idx_flow_versions_def ON flow_versions(flow_definition_id);
CREATE INDEX IF NOT EXISTS idx_flow_versions_status ON flow_versions(status);
CREATE INDEX IF NOT EXISTS idx_tenant_flow_permissions_company ON tenant_flow_permissions(company_id);
CREATE INDEX IF NOT EXISTS idx_intent_flow_mappings_company ON intent_flow_mappings(company_id);
CREATE INDEX IF NOT EXISTS idx_flow_runs_company ON flow_runs(company_id);
CREATE INDEX IF NOT EXISTS idx_provider_catalog_type ON provider_catalog(type);
CREATE INDEX IF NOT EXISTS idx_tenant_provider_company ON tenant_provider_config(company_id);
CREATE INDEX IF NOT EXISTS idx_tenant_voice_company ON tenant_voice_profiles(company_id);

-- ========================================
-- ROW LEVEL SECURITY (RLS)
-- Enable RLS on all tables for security
-- ========================================
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE managed_interfaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE flow_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE flow_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_flow_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE intent_flow_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE flow_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE flow_run_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_provider_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_voice_profiles ENABLE ROW LEVEL SECURITY;

-- ========================================
-- POLICIES (Allow all for development)
-- Replace these with proper auth policies for production
-- ========================================
-- Drop old policies to ensure idempotency
DROP POLICY IF EXISTS "Allow all for companies" ON companies;
DROP POLICY IF EXISTS "Allow all for brands" ON brands;
DROP POLICY IF EXISTS "Allow all for teams" ON teams;
DROP POLICY IF EXISTS "Allow all for users" ON users;
DROP POLICY IF EXISTS "Allow all for agents" ON agents;
DROP POLICY IF EXISTS "Allow all for managed_interfaces" ON managed_interfaces;
DROP POLICY IF EXISTS "Allow all for workflows" ON workflows;
DROP POLICY IF EXISTS "Allow all for sessions" ON sessions;
DROP POLICY IF EXISTS "Allow all for flow_definitions" ON flow_definitions;
DROP POLICY IF EXISTS "Allow all for flow_versions" ON flow_versions;
DROP POLICY IF EXISTS "Allow all for tenant_flow_permissions" ON tenant_flow_permissions;
DROP POLICY IF EXISTS "Allow all for intent_flow_mappings" ON intent_flow_mappings;
DROP POLICY IF EXISTS "Allow all for flow_runs" ON flow_runs;
DROP POLICY IF EXISTS "Allow all for flow_run_evidence" ON flow_run_evidence;
DROP POLICY IF EXISTS "Allow all for provider_catalog" ON provider_catalog;
DROP POLICY IF EXISTS "Allow all for tenant_provider_config" ON tenant_provider_config;
DROP POLICY IF EXISTS "Allow all for tenant_voice_profiles" ON tenant_voice_profiles;

CREATE POLICY "Allow all for companies" ON companies FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for brands" ON brands FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for teams" ON teams FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for users" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for agents" ON agents FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for managed_interfaces" ON managed_interfaces FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for workflows" ON workflows FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for sessions" ON sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for flow_definitions" ON flow_definitions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for flow_versions" ON flow_versions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for tenant_flow_permissions" ON tenant_flow_permissions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for intent_flow_mappings" ON intent_flow_mappings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for flow_runs" ON flow_runs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for flow_run_evidence" ON flow_run_evidence FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for provider_catalog" ON provider_catalog FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for tenant_provider_config" ON tenant_provider_config FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for tenant_voice_profiles" ON tenant_voice_profiles FOR ALL USING (true) WITH CHECK (true);

-- ========================================
-- SEED DATA (Optional - Migrate existing data)
-- ========================================

-- Sample Company
INSERT INTO companies (name, industry, agent_count) VALUES 
    ('Acme Corp', 'Technology', 45),
    ('GlobalBank', 'Financial Services', 120),
    ('TechStart', 'SaaS', 12)
ON CONFLICT DO NOTHING;

-- Sample Managed Interfaces (from your existing data)
INSERT INTO managed_interfaces (name, base_url, icon, status) VALUES 
    ('Salesforce Production', 'https://api.salesforce.com', '🔵', 'connected'),
    ('Genesys Cloud', 'https://api.genesys.cloud', '🟢', 'connected'),
    ('Avaya OneCloud', 'https://api.avaya.com', '🔴', 'disconnected')
ON CONFLICT DO NOTHING;

-- ========================================
-- KNOWLEDGE BASE (RAG)
-- ========================================

-- Enable vector extension for embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Documents (Metadata)
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('pdf', 'docx', 'url', 'text')),
    status TEXT DEFAULT 'indexing' CHECK (status IN ('indexed', 'indexing', 'error')),
    metadata JSONB DEFAULT '{}',
    chunk_count INT DEFAULT 0,
    size_bytes BIGINT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Document Chunks (Vector Store)
CREATE TABLE IF NOT EXISTS document_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    embedding vector(1536), -- OpenAI text-embedding-3-small dimension
    chunk_index INT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for Knowledge Base
CREATE INDEX IF NOT EXISTS idx_document_chunks_document ON document_chunks(document_id);
-- HNSW index for fast vector similarity search
CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding ON document_chunks USING hnsw (embedding vector_cosine_ops);

-- RLS for Knowledge Base
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for documents" ON documents;
DROP POLICY IF EXISTS "Allow all for document_chunks" ON document_chunks;

CREATE POLICY "Allow all for documents" ON documents FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for document_chunks" ON document_chunks FOR ALL USING (true) WITH CHECK (true);

-- ========================================
-- RPC: Vector Search Function
-- ========================================
CREATE OR REPLACE FUNCTION match_documents (
  query_embedding vector(1536),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id uuid,
  content text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    document_chunks.id,
    document_chunks.content,
    1 - (document_chunks.embedding <=> query_embedding) as similarity
  FROM document_chunks
  WHERE 1 - (document_chunks.embedding <=> query_embedding) > match_threshold
  ORDER BY document_chunks.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Verification query
SELECT 'Schema and RPC created successfully!' as message;
SELECT 'Tables created:' as info, 
       (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public') as table_count;
