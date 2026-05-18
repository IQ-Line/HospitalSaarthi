-- Align configurator.tenant_modules with shared tenant audit columns.
-- Rerunnable: safe when is_enabled was already renamed to is_active.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'configurator'
      AND table_name = 'tenant_modules'
      AND column_name = 'is_enabled'
  ) THEN
    ALTER TABLE configurator.tenant_modules
      RENAME COLUMN is_enabled TO is_active;
  END IF;
END $$;

ALTER TABLE configurator.tenant_modules
  ADD COLUMN IF NOT EXISTS created_by uuid;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'configurator'
      AND table_name = 'tenant_modules'
      AND column_name = 'enabled_by'
  ) THEN
    UPDATE configurator.tenant_modules
    SET created_by = enabled_by
    WHERE created_by IS NULL
      AND enabled_by IS NOT NULL;
  END IF;
END $$;

ALTER TABLE configurator.tenant_modules
  DROP COLUMN IF EXISTS enabled_at,
  DROP COLUMN IF EXISTS disabled_at,
  DROP COLUMN IF EXISTS enabled_by;

ALTER TABLE configurator.tenant_modules
  DROP CONSTRAINT IF EXISTS chk_tenant_modules_core_always_enabled;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_tenant_modules_core_always_active'
      AND conrelid = 'configurator.tenant_modules'::regclass
  ) THEN
    ALTER TABLE configurator.tenant_modules
      ADD CONSTRAINT chk_tenant_modules_core_always_active CHECK (
        NOT (is_core_override AND NOT is_active)
      );
  END IF;
END $$;

DROP INDEX IF EXISTS configurator.idx_tenant_modules_enabled;

CREATE INDEX IF NOT EXISTS idx_tenant_modules_active
  ON configurator.tenant_modules (iq_tenant_id, is_active);
