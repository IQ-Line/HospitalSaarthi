-- Align configurator.tenant_modules with shared tenant audit columns.

ALTER TABLE configurator.tenant_modules
  RENAME COLUMN is_enabled TO is_active;

ALTER TABLE configurator.tenant_modules
  ADD COLUMN IF NOT EXISTS created_by uuid;

UPDATE configurator.tenant_modules
SET created_by = enabled_by
WHERE created_by IS NULL
  AND enabled_by IS NOT NULL;

ALTER TABLE configurator.tenant_modules
  DROP COLUMN IF EXISTS enabled_at,
  DROP COLUMN IF EXISTS disabled_at,
  DROP COLUMN IF EXISTS enabled_by;

ALTER TABLE configurator.tenant_modules
  DROP CONSTRAINT IF EXISTS chk_tenant_modules_core_always_enabled;

ALTER TABLE configurator.tenant_modules
  ADD CONSTRAINT chk_tenant_modules_core_always_active CHECK (
    NOT (is_core_override AND NOT is_active)
  );

DROP INDEX IF EXISTS configurator.idx_tenant_modules_enabled;

CREATE INDEX IF NOT EXISTS idx_tenant_modules_active
  ON configurator.tenant_modules (iq_tenant_id, is_active);
