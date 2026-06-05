-- Partner integration control plane (ADR-0032 PR-2).

CREATE TABLE IF NOT EXISTS integration_hub.integrations (
  iq_tenant_id uuid NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  integration_type text NOT NULL,
  direction text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  partner_principal_id uuid,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (iq_tenant_id, id),
  CONSTRAINT integrations_direction_chk CHECK (direction IN ('inbound', 'outbound', 'bidirectional')),
  CONSTRAINT integrations_status_chk CHECK (status IN ('draft', 'active', 'disabled')),
  CONSTRAINT integrations_type_not_blank_chk CHECK (length(btrim(integration_type)) > 0),
  CONSTRAINT integrations_name_not_blank_chk CHECK (length(btrim(name)) > 0),
  CONSTRAINT integrations_partner_principal_active_chk CHECK (
    status = 'draft' OR partner_principal_id IS NOT NULL
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_integrations_tenant_name
  ON integration_hub.integrations (iq_tenant_id, lower(btrim(name)));

CREATE INDEX IF NOT EXISTS idx_integrations_tenant_status
  ON integration_hub.integrations (iq_tenant_id, status);

CREATE INDEX IF NOT EXISTS idx_integrations_tenant_type
  ON integration_hub.integrations (iq_tenant_id, integration_type);

CREATE TABLE IF NOT EXISTS integration_hub.integration_api_keys (
  iq_tenant_id uuid NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  integration_id uuid NOT NULL,
  key_prefix text NOT NULL,
  key_hash text NOT NULL,
  label text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  rate_limit_rpm integer,
  expires_at timestamptz,
  last_used_at timestamptz,
  created_by uuid,
  revoked_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  PRIMARY KEY (iq_tenant_id, id),
  CONSTRAINT integration_api_keys_status_chk CHECK (status IN ('active', 'revoked', 'expired')),
  CONSTRAINT integration_api_keys_prefix_not_blank_chk CHECK (length(btrim(key_prefix)) > 0),
  CONSTRAINT integration_api_keys_hash_not_blank_chk CHECK (length(btrim(key_hash)) > 0),
  CONSTRAINT integration_api_keys_label_not_blank_chk CHECK (length(btrim(label)) > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_integration_api_keys_prefix
  ON integration_hub.integration_api_keys (key_prefix);

CREATE INDEX IF NOT EXISTS idx_integration_api_keys_tenant_integration
  ON integration_hub.integration_api_keys (iq_tenant_id, integration_id);

CREATE INDEX IF NOT EXISTS idx_integration_api_keys_active_prefix
  ON integration_hub.integration_api_keys (key_prefix)
  WHERE status = 'active';
