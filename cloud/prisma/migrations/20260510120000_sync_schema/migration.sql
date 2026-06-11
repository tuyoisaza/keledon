-- Sync schema: adds all tables/columns missing from the initial migration
-- Initial migration only had: users, sessions, events
-- This migration brings the DB in line with the full Prisma schema

-- ========== COMPANIES ==========
CREATE TABLE IF NOT EXISTS "companies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "industry" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "company_countries" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "company_countries_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "company_countries_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "company_countries_companyId_countryCode_key" UNIQUE ("companyId", "countryCode")
);

-- ========== BRANDS ==========
CREATE TABLE IF NOT EXISTS "brands" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "brands_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "brands_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- ========== TEAMS ==========
CREATE TABLE IF NOT EXISTS "teams" (
    "id" TEXT NOT NULL,
    "brandId" TEXT,
    "name" TEXT NOT NULL,
    "country" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "sttProvider" TEXT NOT NULL DEFAULT 'vosk',
    "ttsProvider" TEXT NOT NULL DEFAULT 'elevenlabs',
    "voskServerUrl" TEXT,
    "voskModel" TEXT,
    "deepgramApiKey" TEXT,
    "elevenlabsApiKey" TEXT,
    "escalationTriggers" TEXT[] DEFAULT ARRAY['sue','lawsuit','court','lawyer','attorney','complain','manager','supervisor','media','news','journalist','social media'],
    CONSTRAINT "teams_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "teams_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- ========== USERS - add new columns (if migration already created users table) ==========
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "companyId" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "teamId" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "isOnline" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "lastLogin" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "passwordHash" TEXT;

-- Add foreign keys for users (safe if columns already exist)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='companyId') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='users_companyId_fkey') THEN
            ALTER TABLE "users" ADD CONSTRAINT "users_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='teamId') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='users_teamId_fkey') THEN
            ALTER TABLE "users" ADD CONSTRAINT "users_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;
    END IF;
END $$;

-- ========== DEVICES ==========
CREATE TABLE IF NOT EXISTS "devices" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "organizationId" TEXT,
    "keledonId" TEXT,
    "name" TEXT NOT NULL,
    "machineId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "pairingCode" TEXT,
    "pairingCodeExpiresAt" TIMESTAMP(3),
    "authToken" TEXT,
    "cdpUrl" TEXT,
    "lastSeen" TIMESTAMP(3),
    "version" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "devices_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "devices_machineId_key" UNIQUE ("machineId"),
    CONSTRAINT "devices_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- ========== AGENTS (keledons) ==========
CREATE TABLE IF NOT EXISTS "agents" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "brandId" TEXT,
    "countryCode" TEXT,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "role" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "callsHandled" INTEGER NOT NULL DEFAULT 0,
    "fcrRate" DOUBLE PRECISION,
    "avgHandleTime" DOUBLE PRECISION,
    "autonomyLevel" INTEGER NOT NULL DEFAULT 5,
    "policies" TEXT,
    "uiInterfaces" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "agents_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "agents_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "agents_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- ========== MANAGED INTERFACES ==========
CREATE TABLE IF NOT EXISTS "managed_interfaces" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "baseUrl" TEXT NOT NULL,
    "category" TEXT,
    "providerKey" TEXT,
    "capabilities" TEXT,
    "icon" TEXT,
    "status" TEXT NOT NULL DEFAULT 'disconnected',
    "credentials" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "managed_interfaces_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "team_interfaces" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "interfaceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "team_interfaces_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "team_interfaces_teamId_interfaceId_key" UNIQUE ("teamId", "interfaceId"),
    CONSTRAINT "team_interfaces_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "team_interfaces_interfaceId_fkey" FOREIGN KEY ("interfaceId") REFERENCES "managed_interfaces"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- ========== WORKFLOWS ==========
CREATE TABLE IF NOT EXISTS "workflows" (
    "id" TEXT NOT NULL,
    "interfaceId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "trigger" TEXT NOT NULL,
    "steps" TEXT NOT NULL,
    "variables" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "workflows_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "flow_definitions" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "definition" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "flow_definitions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "flow_definition_versions" (
    "id" TEXT NOT NULL,
    "flowDefinitionId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "definition" TEXT NOT NULL,
    "changelog" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "flow_definition_versions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "flow_definition_versions_flowDefinitionId_version_key" UNIQUE ("flowDefinitionId", "version"),
    CONSTRAINT "flow_definition_versions_flowDefinitionId_fkey" FOREIGN KEY ("flowDefinitionId") REFERENCES "flow_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "tenant_flow_permissions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "canExecute" BOOLEAN NOT NULL DEFAULT true,
    "canEdit" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "tenant_flow_permissions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "tenant_flow_permissions_tenantId_workflowId_key" UNIQUE ("tenantId", "workflowId")
);

CREATE TABLE IF NOT EXISTS "intent_flow_mappings" (
    "id" TEXT NOT NULL,
    "intent" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "confidence" INTEGER NOT NULL DEFAULT 80,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "intent_flow_mappings_pkey" PRIMARY KEY ("id")
);

-- ========== FLOWS (enhanced) ==========
CREATE TABLE IF NOT EXISTS "flows" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "triggerKeywords" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'general',
    "tool" TEXT NOT NULL DEFAULT 'browser',
    "teamId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "flows_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "flows_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "flow_steps" (
    "id" TEXT NOT NULL,
    "flowId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "selector" TEXT,
    "selectorType" TEXT NOT NULL DEFAULT 'css',
    "value" TEXT,
    "extract" TEXT,
    "waitFor" TEXT,
    "condition" TEXT,
    "timeout" INTEGER NOT NULL DEFAULT 10000,
    "optional" BOOLEAN NOT NULL DEFAULT false,
    "nextStepId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "flow_steps_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "flow_steps_flowId_fkey" FOREIGN KEY ("flowId") REFERENCES "flows"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "flow_steps_flowId_idx" ON "flow_steps"("flowId");

-- ========== FLOW RUNS ==========
CREATE TABLE IF NOT EXISTS "flow_runs" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT,
    "flowId" TEXT,
    "sessionId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "result" TEXT,
    "error" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    CONSTRAINT "flow_runs_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "flow_runs_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "workflows"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "flow_runs_flowId_fkey" FOREIGN KEY ("flowId") REFERENCES "flows"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "flow_runs_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "flow_run_evidence" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "flow_run_evidence_pkey" PRIMARY KEY ("id")
);

-- ========== SUBAGENTS ==========
CREATE TABLE IF NOT EXISTS "sub_agents" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'idle',
    "sessionId" TEXT,
    "currentTask" TEXT,
    "maxParallel" INTEGER NOT NULL DEFAULT 1,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "sub_agents_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "sub_agents_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "sub_agent_runs" (
    "id" TEXT NOT NULL,
    "subAgentId" TEXT NOT NULL,
    "flowRunId" TEXT,
    "flowId" TEXT,
    "flowStepIds" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "result" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    CONSTRAINT "sub_agent_runs_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "sub_agent_runs_subAgentId_fkey" FOREIGN KEY ("subAgentId") REFERENCES "sub_agents"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "sub_agent_runs_flowRunId_fkey" FOREIGN KEY ("flowRunId") REFERENCES "flow_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "sub_agent_runs_subAgentId_idx" ON "sub_agent_runs"("subAgentId");
CREATE INDEX IF NOT EXISTS "sub_agent_runs_flowRunId_idx" ON "sub_agent_runs"("flowRunId");

-- ========== PROVIDERS ==========
CREATE TABLE IF NOT EXISTS "provider_catalog" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'production',
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "provider_catalog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "tenant_provider_config" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "providerType" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "limits" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "tenant_provider_config_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "tenant_provider_config_companyId_providerId_key" UNIQUE ("companyId", "providerId"),
    CONSTRAINT "tenant_provider_config_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "tenant_provider_config_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "provider_catalog"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "tenant_voice_profiles" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'en',
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "config" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "tenant_voice_profiles_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "tenant_voice_profiles_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "tenant_voice_profiles_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "provider_catalog"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- ========== SESSIONS - add new columns ==========
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "teamId" TEXT;
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "metadata" TEXT;
ALTER TABLE "sessions" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sessions' AND column_name='userId') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='sessions_userId_fkey') THEN
            ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sessions' AND column_name='teamId') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='sessions_teamId_fkey') THEN
            ALTER TABLE "sessions" ADD CONSTRAINT "sessions_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;
    END IF;
END $$;

-- ========== EVENTS - add column if missing ==========
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "payload" TEXT;
ALTER TABLE "events" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;

-- ========== KNOWLEDGE / RAG ==========
CREATE TABLE IF NOT EXISTS "knowledge_bases" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "knowledge_bases_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "knowledge_documents" (
    "id" TEXT NOT NULL,
    "knowledgeBaseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" TEXT,
    "vectorIds" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "knowledge_documents_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "knowledge_documents_knowledgeBaseId_fkey" FOREIGN KEY ("knowledgeBaseId") REFERENCES "knowledge_bases"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- ========== AUDIT LOGS ==========
CREATE TABLE IF NOT EXISTS "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "changes" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "audit_logs_userId_idx" ON "audit_logs"("userId");
CREATE INDEX IF NOT EXISTS "audit_logs_entity_entityId_idx" ON "audit_logs"("entity", "entityId");

-- ========== FEATURE FLAGS ==========
CREATE TABLE IF NOT EXISTS "feature_flags" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "scope" TEXT NOT NULL DEFAULT 'global',
    "scopeId" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),
    CONSTRAINT "feature_flags_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "feature_flags_name_key" UNIQUE ("name")
);
CREATE INDEX IF NOT EXISTS "feature_flags_scope_scopeId_idx" ON "feature_flags"("scope", "scopeId");

-- ========== ESCALATION LOGS ==========
CREATE TABLE IF NOT EXISTS "escalation_logs" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT,
    "teamId" TEXT,
    "deviceId" TEXT,
    "trigger" TEXT NOT NULL,
    "triggerType" TEXT NOT NULL DEFAULT 'keyword',
    "transcript" TEXT,
    "status" TEXT NOT NULL DEFAULT 'triggered',
    "metadata" TEXT,
    "acknowledgedBy" TEXT,
    "acknowledgedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "escalation_logs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "escalation_logs_sessionId_idx" ON "escalation_logs"("sessionId");
CREATE INDEX IF NOT EXISTS "escalation_logs_teamId_idx" ON "escalation_logs"("teamId");
CREATE INDEX IF NOT EXISTS "escalation_logs_status_idx" ON "escalation_logs"("status");

-- ========== DEBUG MODE ==========
CREATE TABLE IF NOT EXISTS "debug_mode" (
    "id" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "activatedBy" TEXT,
    "activatedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "autoExpire" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "debug_mode_pkey" PRIMARY KEY ("id")
);

-- ========== VENDORS ==========
CREATE TABLE IF NOT EXISTS "vendors" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "baseUrl" TEXT,
    "username" TEXT,
    "password" TEXT,
    "apiKey" TEXT,
    "config" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "vendors_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "vendors_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "vendors_teamId_idx" ON "vendors"("teamId");
