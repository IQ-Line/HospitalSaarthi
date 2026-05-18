-- Configurator module — tenant module enablement (see modules/configurator/src/schema/tables.ts)

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

CREATE INDEX IF NOT EXISTS idx_tenant_modules_enabled
  ON configurator.tenant_modules (iq_tenant_id, is_enabled);
