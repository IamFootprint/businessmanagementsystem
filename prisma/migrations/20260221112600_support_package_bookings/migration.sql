-- Make serviceItem optional so package-only bookings can be stored.
ALTER TABLE "bookings" ALTER COLUMN "serviceItemId" DROP NOT NULL;

-- Add selectedPackageId if it does not exist yet.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'selectedPackageId'
  ) THEN
    ALTER TABLE "bookings" ADD COLUMN "selectedPackageId" TEXT;
  END IF;
END $$;

-- Add foreign key if it does not exist yet.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bookings_selectedPackageId_fkey'
  ) THEN
    ALTER TABLE "bookings"
    ADD CONSTRAINT "bookings_selectedPackageId_fkey"
    FOREIGN KEY ("selectedPackageId") REFERENCES "service_packages"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "bookings_selectedPackageId_idx" ON "bookings"("selectedPackageId");
