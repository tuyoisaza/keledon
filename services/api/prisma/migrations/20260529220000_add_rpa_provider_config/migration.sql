-- Add rpaProviderConfig JSON column to devices table
ALTER TABLE "devices" ADD COLUMN IF NOT EXISTS "rpaProviderConfig" TEXT;
