-- Backfill tenant_modules for infrastructure modules (platform + foundation).
--
-- Existing tenants created before infrastructure auto-enable may lack
-- platform/foundation modules in their tenant_modules rows.  This migration
-- inserts the missing rows with is_core_override = true so they cannot be
-- accidentally deactivated.
--
-- Idempotent: uses INSERT ... ON CONFLICT DO NOTHING.
-- Safe: does not modify or delete any existing rows.
-- Rollback: DELETE inserted rows WHERE is_core_override AND created_by IS NULL
--           AND created_at >= migration timestamp (see downgrade block below).

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

-- Also update existing infra rows that have is_core_override = false
-- (tenants created during Phase 1 where frontend merged infra modules
-- but backend did not mark them as core).
-- This is handled by the ON CONFLICT ... DO UPDATE above.
