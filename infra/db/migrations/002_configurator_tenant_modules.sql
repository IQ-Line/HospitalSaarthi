-- Configurator module — tenant module enablement (see modules/configurator/src/schema/tables.ts)
-- Rerunnable: safe when 003 has already renamed is_enabled → is_active.

CREATE TABLE IF NOT EXISTS configurator.tenant_modules (
  iq_tenant_id uuid NOT NULL,
  module_id uuid NOT NULL,
  is_enabled boolean NOT NULL DEFAULT true,
  is_core_override boolean NOT NULL DEFAULT false,
  enabled_at timestamptz,
  disabled_at timestamptz,
  enabled_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  PRIMARY KEY (iq_tenant_id, module_id),
  CONSTRAINT chk_tenant_modules_core_always_enabled CHECK (
    NOT (is_core_override AND NOT is_enabled)
  )
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'configurator'
      AND table_name = 'tenant_modules'
      AND column_name = 'is_enabled'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_tenant_modules_enabled
      ON configurator.tenant_modules (iq_tenant_id, is_enabled);
  END IF;
END $$;
