-- Additive only: existing accounts retain NULL lifecycle fields and normal behavior.
ALTER TABLE "users"
  ADD COLUMN "uatFixtureRunId" TEXT,
  ADD COLUMN "uatFixtureExpiresAt" TIMESTAMP(3),
  ADD COLUMN "uatFixtureRetiredAt" TIMESTAMP(3),
  ADD COLUMN "uatFixtureAuthAfter" TIMESTAMP(3);

CREATE TABLE "uat_fixture_runs" (
  "id" TEXT NOT NULL,
  "createdBy" TEXT NOT NULL,
  "members" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "retiredAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "uat_fixture_runs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "uat_fixture_runs_retiredAt_expiresAt_idx"
  ON "uat_fixture_runs"("retiredAt", "expiresAt");
