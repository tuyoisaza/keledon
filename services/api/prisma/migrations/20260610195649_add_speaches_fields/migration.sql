-- Add Speaches configuration fields to the Prisma-mapped teams table.
ALTER TABLE "teams" ADD COLUMN IF NOT EXISTS "speachesApiUrl" TEXT;
ALTER TABLE "teams" ADD COLUMN IF NOT EXISTS "speachesApiKey" TEXT;

-- Update sttProvider comment to include speaches (documentation only)
