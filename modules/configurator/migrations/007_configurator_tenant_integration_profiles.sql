-- Per-tenant integration credentials (Phase 1a — ABDM profiles in configurator)

CREATE TABLE IF NOT EXISTS configurator.tenant_integration_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  iq_tenant_id uuid NOT NULL REFERENCES configurator.tenants (iq_tenant_id),
  integration_kind text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  hip_id text NOT NULL,
  hiu_id text NOT NULL,
  cm_id text NOT NULL DEFAULT 'sbx',
  client_id text,
  client_secret text,
  default_sms_phone text,
  hip_display_name text,
  callback_base_url text,
  sms_provider text,
  sms_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  gateway_environment text NOT NULL DEFAULT 'sandbox',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  CONSTRAINT chk_tenant_integration_profiles_kind CHECK (integration_kind IN ('abdm'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tenant_integration_profiles_tenant_kind
  ON configurator.tenant_integration_profiles (iq_tenant_id, integration_kind);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tenant_integration_profiles_hip_active
  ON configurator.tenant_integration_profiles (hip_id)
  WHERE integration_kind = 'abdm' AND is_active = true;

CREATE INDEX IF NOT EXISTS idx_tenant_integration_profiles_tenant
  ON configurator.tenant_integration_profiles (iq_tenant_id);

COMMENT ON TABLE configurator.tenant_integration_profiles IS
  'Per-tenant integration credentials (ABDM Phase 1a — plaintext secrets until vault in 1b+)';
