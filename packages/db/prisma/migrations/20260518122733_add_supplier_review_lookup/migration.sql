-- CreateEnum
CREATE TYPE "SupplierReviewStatus" AS ENUM ('NEEDS_REVIEW', 'CONFIRMED', 'REJECTED');

-- CreateEnum
CREATE TYPE "SupplierLookupSource" AS ENUM ('MANUAL', 'RULE_SEED', 'IMPORT_AUTO', 'BRAVE', 'CIPC');

-- AlterTable
ALTER TABLE "Supplier" ADD COLUMN     "extractedFromDescription" TEXT,
ADD COLUMN     "lookupRawJson" JSONB,
ADD COLUMN     "lookupSource" "SupplierLookupSource" NOT NULL DEFAULT 'MANUAL',
ADD COLUMN     "reviewStatus" "SupplierReviewStatus" NOT NULL DEFAULT 'CONFIRMED';

-- CreateIndex
CREATE INDEX "Supplier_tenantId_reviewStatus_idx" ON "Supplier"("tenantId", "reviewStatus");
