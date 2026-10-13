-- Repair Speaches fields on the Prisma-mapped table for databases that already
-- recorded the legacy migration before its table-name correction.
ALTER TABLE "teams" ADD COLUMN IF NOT EXISTS "speachesApiUrl" TEXT;
ALTER TABLE "teams" ADD COLUMN IF NOT EXISTS "speachesApiKey" TEXT;
