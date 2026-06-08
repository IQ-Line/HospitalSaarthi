-- Integration Hub control plane — partner integration registry + API keys (ADR-0032).
-- Apply: psql "$DATABASE_URL" -f modules/integration-hub/migrations/0004_integration_hub_control_plane.sql
-- Requires: 0000_integration_hub_schema.sql

CREATE TABLE IF NOT EXISTS integration_hub.integrations (
  iq_tenant_id          uuid        NOT NULL,
  integration_id        uuid        NOT NULL DEFAULT gen_random_uuid(),
  integration_type      text        NOT NULL,
  display_name          text        NOT NULL,
  status                text        NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'disabled')),
  partner_principal_id  uuid,
  config                jsonb       NOT NULL DEFAULT '{}'::jsonb,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  created_by            uuid,
  updated_by            uuid,
  CONSTRAINT integrations_pkey PRIMARY KEY (iq_tenant_id, integration_id)
);

CREATE INDEX IF NOT EXISTS idx_integrations_tenant_status
  ON integration_hub.integrations (iq_tenant_id, status);

CREATE INDEX IF NOT EXISTS idx_integrations_tenant_type
  ON integration_hub.integrations (iq_tenant_id, integration_type);

-- API keys authenticate integration identity only — no scopes/permissions columns (ADR-0032 amendment A).
CREATE TABLE IF NOT EXISTS integration_hub.integration_api_keys (
  iq_tenant_id    uuid        NOT NULL,
  api_key_id      uuid        NOT NULL DEFAULT gen_random_uuid(),
  integration_id  uuid        NOT NULL,
  key_prefix      text        NOT NULL,
  key_hash        text        NOT NULL,
  status          text        NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'revoked')),
  expires_at      timestamptz,
  last_used_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  revoked_at      timestamptz,
  created_by      uuid,
  CONSTRAINT integration_api_keys_pkey PRIMARY KEY (iq_tenant_id, api_key_id)
);

CREATE INDEX IF NOT EXISTS idx_integration_api_keys_integration
  ON integration_hub.integration_api_keys (iq_tenant_id, integration_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_integration_api_keys_prefix
  ON integration_hub.integration_api_keys (key_prefix);

-- TODO (pre-prod): SELECT create_distributed_table('integration_hub.integrations', 'iq_tenant_id');
-- TODO (pre-prod): SELECT create_distributed_table('integration_hub.integration_api_keys', 'iq_tenant_id');
