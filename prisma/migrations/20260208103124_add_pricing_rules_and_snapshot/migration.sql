-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "pricingSnapshotJson" JSONB;

-- CreateTable
CREATE TABLE "pricing_rules" (
    "id" TEXT NOT NULL,
    "calloutFeeCents" INTEGER NOT NULL DEFAULT 25000,
    "platformFeeCents" INTEGER NOT NULL DEFAULT 1500,
    "platformFeePercentBps" INTEGER,
    "partsMarkupBps" INTEGER NOT NULL DEFAULT 1000,
    "travelBandRulesJson" JSONB NOT NULL,
    "afterHoursEnabled" BOOLEAN NOT NULL DEFAULT false,
    "afterHoursSurchargeBps" INTEGER NOT NULL DEFAULT 1500,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pricing_rules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pricing_rules_isActive_effectiveFrom_idx" ON "pricing_rules"("isActive", "effectiveFrom");
