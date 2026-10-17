ALTER TABLE "managed_interfaces"
ADD COLUMN "companyId" TEXT;

ALTER TABLE "managed_interfaces"
ADD CONSTRAINT "managed_interfaces_companyId_fkey"
FOREIGN KEY ("companyId") REFERENCES "companies"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "managed_interfaces_companyId_idx"
ON "managed_interfaces"("companyId");
