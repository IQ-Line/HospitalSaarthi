-- Deactivate tenant_modules rows that cannot be resolved against Master Data catalog.
-- Prevents UM MODULE_ENTITLEMENT_LOOKUP_FAILED (ADR-0032) when module_id is missing,
-- soft-deleted, or from another environment (non-portable gen_random_uuid seeds).
--
-- Idempotent: only touches rows that are currently is_active = true.
-- Re-enable correct L1 modules via Configurator UI after deploy (uses live catalog ids).

UPDATE configurator.tenant_modules tm
SET
  is_active = false,
  updated_at = now()
WHERE tm.is_active = true
  AND NOT EXISTS (
    SELECT 1
    FROM global_master.modules m
    WHERE m.id = tm.module_id
      AND m.is_deleted = false
  );

-- L2+ rows are not tenant-toggle targets (L1-only UI); deactivate stale child enablement.
UPDATE configurator.tenant_modules tm
SET
  is_active = false,
  updated_at = now()
WHERE tm.is_active = true
  AND EXISTS (
    SELECT 1
    FROM global_master.modules m
    WHERE m.id = tm.module_id
      AND m.is_deleted = false
      AND (m.level > 1 OR m.parent_id IS NOT NULL)
  );
