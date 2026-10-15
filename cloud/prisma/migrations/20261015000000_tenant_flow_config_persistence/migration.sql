CREATE TABLE "tenant_flow_config_definitions" (
  "id" TEXT NOT NULL,
  "companyId" TEXT,
  "interfaceId" TEXT,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "category" TEXT NOT NULL DEFAULT 'case',
  "status" TEXT NOT NULL DEFAULT 'active',
  "intentTags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "tenant_flow_config_definitions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "tenant_flow_config_definitions_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "tenant_flow_config_definitions_companyId_idx" ON "tenant_flow_config_definitions"("companyId");
CREATE UNIQUE INDEX "tenant_flow_config_definitions_id_companyId_key" ON "tenant_flow_config_definitions"("id", "companyId");

CREATE TABLE "tenant_flow_config_versions" (
  "id" TEXT NOT NULL,
  "flowDefinitionId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "steps" JSONB NOT NULL DEFAULT '[]',
  "createdBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "tenant_flow_config_versions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "tenant_flow_config_versions_flowDefinitionId_fkey" FOREIGN KEY ("flowDefinitionId") REFERENCES "tenant_flow_config_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "tenant_flow_config_versions_flowDefinitionId_version_key" ON "tenant_flow_config_versions"("flowDefinitionId", "version");

CREATE TABLE "tenant_flow_config_permissions" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "flowDefinitionId" TEXT NOT NULL,
  "isEnabled" BOOLEAN NOT NULL DEFAULT true,
  "defaultForIntent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "tenant_flow_config_permissions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "tenant_flow_config_permissions_flowDefinitionId_companyId_fkey" FOREIGN KEY ("flowDefinitionId", "companyId") REFERENCES "tenant_flow_config_definitions"("id", "companyId") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "tenant_flow_config_permissions_companyId_flowDefinitionId_key" ON "tenant_flow_config_permissions"("companyId", "flowDefinitionId");

CREATE TABLE "tenant_intent_flow_config_mappings" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "intent" TEXT NOT NULL,
  "allowedFlowDefinitionIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "tenant_intent_flow_config_mappings_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "tenant_intent_flow_config_mappings_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "tenant_intent_flow_config_mappings_companyId_intent_key" ON "tenant_intent_flow_config_mappings"("companyId", "intent");
