-- Additive only. Review and apply through the owner's normal migration process.
-- No existing records, roles, provider keys, defaults or tenant bindings are modified.
CREATE TABLE "ai_prompt_definitions" (
 "id" TEXT PRIMARY KEY, "name" TEXT NOT NULL,
 "personalityPrompt" TEXT NOT NULL, "executionPrompt" TEXT NOT NULL,
 "outputSchemaJson" JSONB NOT NULL, "enabled" BOOLEAN NOT NULL DEFAULT true,
 "revision" INTEGER NOT NULL DEFAULT 1, "updatedBy" TEXT NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE TABLE "ai_prompt_revisions" (
 "id" TEXT PRIMARY KEY, "promptId" TEXT NOT NULL,
 "fromRevision" INTEGER NOT NULL, "toRevision" INTEGER NOT NULL,
 "actorId" TEXT NOT NULL, "changedFields" JSONB NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "ai_prompt_revisions_promptId_fkey" FOREIGN KEY ("promptId") REFERENCES "ai_prompt_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ai_prompt_revisions_promptId_toRevision_key" ON "ai_prompt_revisions"("promptId", "toRevision");
CREATE TABLE "ai_call_usage" (
 "id" TEXT PRIMARY KEY, "promptId" TEXT NOT NULL, "promptRevision" INTEGER NOT NULL,
 "feature" TEXT NOT NULL, "teamId" TEXT, "provider" TEXT NOT NULL,
 "requestedModel" TEXT NOT NULL, "responseModel" TEXT,
 "inputTokens" INTEGER, "outputTokens" INTEGER, "latencyMs" INTEGER NOT NULL,
 "costUsd" DOUBLE PRECISION, "pricingMetadata" JSONB, "errorCode" TEXT,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "ai_call_usage_promptId_fkey" FOREIGN KEY ("promptId") REFERENCES "ai_prompt_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "ai_call_usage_createdAt_idx" ON "ai_call_usage"("createdAt");
CREATE INDEX "ai_call_usage_promptId_createdAt_idx" ON "ai_call_usage"("promptId", "createdAt");
