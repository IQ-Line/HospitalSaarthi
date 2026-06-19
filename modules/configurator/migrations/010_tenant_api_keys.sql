-- Tenant-scoped API keys for external integrations (Smart Report OPD slip MVP)

CREATE TABLE IF NOT EXISTS configurator.tenant_api_keys (
  api_key_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  iq_tenant_id uuid NOT NULL REFERENCES configurator.tenants (iq_tenant_id),
  key_prefix text NOT NULL,
  key_hash text NOT NULL,
  label text,
  purpose text NOT NULL DEFAULT 'opd_slip',
  environment text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  expires_at timestamptz,
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  CONSTRAINT chk_tenant_api_keys_purpose CHECK (purpose IN ('opd_slip')),
  CONSTRAINT chk_tenant_api_keys_environment CHECK (environment IN ('live', 'test')),
  CONSTRAINT chk_tenant_api_keys_status CHECK (status IN ('active', 'disabled', 'revoked'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tenant_api_keys_prefix
  ON configurator.tenant_api_keys (key_prefix);

CREATE INDEX IF NOT EXISTS idx_tenant_api_keys_tenant
  ON configurator.tenant_api_keys (iq_tenant_id);

CREATE INDEX IF NOT EXISTS idx_tenant_api_keys_tenant_status
  ON configurator.tenant_api_keys (iq_tenant_id, status);

COMMENT ON TABLE configurator.tenant_api_keys IS
  'Tenant API keys for machine-to-machine access (OPD slip PDF — purpose opd_slip).';
