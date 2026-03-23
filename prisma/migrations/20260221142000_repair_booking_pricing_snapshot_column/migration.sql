-- Repair drift for environments that were baseline-marked with a pre-existing
-- schema and missed the original pricing snapshot column migration.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'bookings'
      AND column_name = 'pricingSnapshotJson'
  ) THEN
    ALTER TABLE "bookings" ADD COLUMN "pricingSnapshotJson" JSONB;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'bookings'
      AND column_name = 'pricing_snapshot_json'
  ) THEN
    EXECUTE
      'UPDATE "bookings"
       SET "pricingSnapshotJson" = COALESCE("pricingSnapshotJson", "pricing_snapshot_json")
       WHERE "pricingSnapshotJson" IS NULL';
  END IF;
END $$;
