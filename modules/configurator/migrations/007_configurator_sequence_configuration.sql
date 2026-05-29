-- Tenant numeric code (UHID / sequence segment) + sequence master configuration.

ALTER TABLE configurator.tenants
  ADD COLUMN IF NOT EXISTS tenant_numeric_code TEXT;

CREATE TABLE IF NOT EXISTS configurator.sequence_configuration (
  iq_tenant_id UUID PRIMARY KEY REFERENCES configurator.tenants (iq_tenant_id),
  status TEXT NOT NULL DEFAULT 'default',
  configured_at TIMESTAMPTZ,
  identifier_overrides JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  updated_by UUID,
  CONSTRAINT chk_sequence_configuration_status CHECK (status IN ('default', 'configured'))
);

CREATE INDEX IF NOT EXISTS idx_sequence_configuration_status
  ON configurator.sequence_configuration (status);
