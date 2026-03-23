-- Enable Row Level Security on all shop-scoped tables
-- Defense-in-depth: ensures tenant isolation at the database level
-- Requires: SET app.current_shop_id = '<shopId>' before queries

-- Tables with direct shopId (required):
--   bookings, job_cards, invoices, service_items, service_packages,
--   pricing_rules, availability_blocks, audit_logs, support_tickets, invites
--
-- Tables with optional shopId:
--   profiles (shopId nullable - customers may not belong to a shop)
--   audit_events (shopId nullable - system events may not have a shop)
--
-- Child tables (no shopId, inherit isolation from parent via FK):
--   job_card_notes, job_card_parts, job_card_additional_charges,
--   invoice_line_items, support_ticket_notes

-- ═══════════════════════════════════════════════════════════════════════════════
-- Tables with REQUIRED shopId — strict isolation
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'bookings', 'job_cards', 'invoices', 'service_items', 'service_packages',
    'pricing_rules', 'availability_blocks', 'audit_logs', 'support_tickets', 'invites'
  ]) LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = tbl AND table_schema = 'public') THEN
      EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
      EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', tbl);

      -- Drop existing policy if any
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I', tbl || '_shop_isolation', tbl);

      -- Create policy: only rows matching current_setting('app.current_shop_id') are visible
      EXECUTE format(
        'CREATE POLICY %I ON %I USING ("shopId" = current_setting(''app.current_shop_id'', true)::text) WITH CHECK ("shopId" = current_setting(''app.current_shop_id'', true)::text)',
        tbl || '_shop_isolation', tbl
      );
    END IF;
  END LOOP;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- Tables with OPTIONAL shopId — permissive (allow NULL shopId rows through)
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY['profiles', 'audit_events']) LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = tbl AND table_schema = 'public') THEN
      EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
      EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', tbl);

      EXECUTE format('DROP POLICY IF EXISTS %I ON %I', tbl || '_shop_isolation', tbl);

      -- Allow access when shopId matches OR shopId is NULL
      EXECUTE format(
        'CREATE POLICY %I ON %I USING ("shopId" IS NULL OR "shopId" = current_setting(''app.current_shop_id'', true)::text) WITH CHECK ("shopId" IS NULL OR "shopId" = current_setting(''app.current_shop_id'', true)::text)',
        tbl || '_shop_isolation', tbl
      );
    END IF;
  END LOOP;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- Bypass policy for the Prisma migration user / superuser
-- RLS is enforced even for table owners due to FORCE ROW LEVEL SECURITY.
-- The application should SET app.current_shop_id before each request.
-- Superusers bypass RLS automatically in PostgreSQL.
-- ═══════════════════════════════════════════════════════════════════════════════
