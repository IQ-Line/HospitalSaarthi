-- Configurator module — tenant module enablement (see modules/configurator/src/schema/tables.ts)

CREATE TABLE IF NOT EXISTS configurator.tenant_modules (
  iq_tenant_id uuid NOT NULL,
  module_id uuid NOT NULL,
  is_core_override boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  PRIMARY KEY (iq_tenant_id, module_id)
);

ALTER TABLE configurator.tenant_modules
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'configurator'
      AND table_name = 'tenant_modules'
      AND column_name = 'is_enabled'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'configurator'
      AND table_name = 'tenant_modules'
      AND column_name = 'is_active'
  ) THEN
    ALTER TABLE configurator.tenant_modules
      RENAME COLUMN is_enabled TO is_active;
  ELSIF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'configurator'
      AND table_name = 'tenant_modules'
      AND column_name = 'is_enabled'
  )
  AND EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'configurator'
      AND table_name = 'tenant_modules'
      AND column_name = 'is_active'
  ) THEN
    ALTER TABLE configurator.tenant_modules DROP COLUMN is_enabled;
  END IF;
END $$;

ALTER TABLE configurator.tenant_modules
  ALTER COLUMN is_active SET DEFAULT true;

ALTER TABLE configurator.tenant_modules
  DROP COLUMN IF EXISTS enabled_at,
  DROP COLUMN IF EXISTS disabled_at,
  DROP COLUMN IF EXISTS enabled_by;

ALTER TABLE configurator.tenant_modules
  DROP CONSTRAINT IF EXISTS chk_tenant_modules_core_always_enabled;

ALTER TABLE configurator.tenant_modules
  DROP CONSTRAINT IF EXISTS chk_tenant_modules_core_always_active;

DO $$
BEGIN
  ALTER TABLE configurator.tenant_modules
    ADD CONSTRAINT chk_tenant_modules_core_always_active CHECK (
      NOT (is_core_override AND NOT is_active)
    );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DROP INDEX IF EXISTS configurator.idx_tenant_modules_enabled;

CREATE INDEX IF NOT EXISTS idx_tenant_modules_active
  ON configurator.tenant_modules (iq_tenant_id, is_active);
