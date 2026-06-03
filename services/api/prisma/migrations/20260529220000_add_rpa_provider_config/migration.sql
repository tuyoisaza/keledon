-- Add rpaProviderConfig JSON column to devices table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'devices') THEN
    ALTER TABLE "devices" ADD COLUMN IF NOT EXISTS "rpaProviderConfig" TEXT;
  END IF;
END $$;
