-- Preserve tenant attribution on audit events independently of later user or company changes.
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "companyId" TEXT;
CREATE INDEX IF NOT EXISTS "audit_logs_companyId_createdAt_idx" ON "audit_logs"("companyId", "createdAt");
