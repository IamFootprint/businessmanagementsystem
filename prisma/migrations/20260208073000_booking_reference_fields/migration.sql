-- Add booking reference and guest booking fields
CREATE TYPE "BookingSelectionType" AS ENUM ('SERVICE', 'PACKAGE');

ALTER TABLE "bookings"
  ADD COLUMN "referenceCode" TEXT,
  ADD COLUMN "addressText" TEXT,
  ADD COLUMN "addressLat" DOUBLE PRECISION,
  ADD COLUMN "addressLng" DOUBLE PRECISION,
  ADD COLUMN "notes" TEXT,
  ADD COLUMN "selectionType" "BookingSelectionType",
  ADD COLUMN "selectedItemName" TEXT;

UPDATE "bookings"
SET "referenceCode" = concat('SMBJ-', to_char(now(), 'YYYYMMDD'), '-', lpad((floor(random() * 9999))::text, 4, '0'))
WHERE "referenceCode" IS NULL;

UPDATE "bookings"
SET "addressText" = 'Unknown'
WHERE "addressText" IS NULL;

UPDATE "bookings"
SET "selectionType" = 'SERVICE'
WHERE "selectionType" IS NULL;

UPDATE "bookings"
SET "selectedItemName" = 'Unknown'
WHERE "selectedItemName" IS NULL;

ALTER TABLE "bookings"
  ALTER COLUMN "referenceCode" SET NOT NULL,
  ALTER COLUMN "addressText" SET NOT NULL,
  ALTER COLUMN "selectionType" SET NOT NULL,
  ALTER COLUMN "selectedItemName" SET NOT NULL;

CREATE UNIQUE INDEX "bookings_referenceCode_key" ON "bookings"("referenceCode");
