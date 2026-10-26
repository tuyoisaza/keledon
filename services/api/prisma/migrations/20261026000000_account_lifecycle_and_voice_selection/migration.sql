-- Additive lifecycle controls; existing roles/accounts remain provisioned and active.
ALTER TABLE "users" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "users" ADD COLUMN "authAfter" TIMESTAMP(3);
ALTER TABLE "teams" ADD COLUMN "ttsVoiceProfileId" TEXT;
ALTER TABLE "teams" ADD COLUMN "ttsVoiceSettings" TEXT;
