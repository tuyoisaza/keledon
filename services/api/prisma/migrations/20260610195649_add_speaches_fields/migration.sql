-- Add Speaches configuration fields to Team
ALTER TABLE "Team" ADD COLUMN "speachesApiUrl" TEXT;
ALTER TABLE "Team" ADD COLUMN "speachesApiKey" TEXT;

-- Update sttProvider comment to include speaches (documentation only)
