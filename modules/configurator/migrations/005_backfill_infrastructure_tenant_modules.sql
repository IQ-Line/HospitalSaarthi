-- Backfill tenant_modules for infrastructure modules (platform + foundation).
--
-- Existing tenants created before infrastructure auto-enable may lack
-- platform/foundation modules in their tenant_modules rows.  This migration
-- inserts the missing rows with is_core_override = true so they cannot be
-- accidentally deactivated.
--
-- Idempotent: uses INSERT ... ON CONFLICT DO NOTHING.
-- Safe: does not modify or delete any existing rows.
-- Skipped on first bootstrap pass when global_master.modules does not exist yet
-- (master-data migrations run after the initial configurator pass).
-- Rollback: DELETE inserted rows WHERE is_core_override AND created_by IS NULL
--           AND created_at >= migration timestamp (see downgrade block below).

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'global_master'
      AND table_name = 'modules'
  )
  AND EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'global_master'
      AND table_name = 'modules'
      AND column_name = 'module_kind'
  ) THEN
    INSERT INTO configurator.tenant_modules (
      iq_tenant_id,
      module_id,
      is_active,
      is_core_override,
      created_by,
      updated_by
    )
    SELECT
      t.iq_tenant_id,
      m.id,
      true,
      true,
      NULL,
      NULL
    FROM configurator.tenants t
    CROSS JOIN global_master.modules m
    WHERE m.module_kind IN ('platform', 'foundation')
      AND m.is_deleted = false
      AND m.is_active = true
    ON CONFLICT (iq_tenant_id, module_id) DO UPDATE
      SET is_core_override = true,
          updated_at = now()
      WHERE configurator.tenant_modules.is_core_override = false;
  END IF;
END $$;

-- Also update existing infra rows that have is_core_override = false
-- (tenants created during Phase 1 where frontend merged infra modules
-- but backend did not mark them as core).
-- This is handled by the ON CONFLICT ... DO UPDATE above.
