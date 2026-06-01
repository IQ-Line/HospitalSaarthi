-- ABDM Adapter — M2 schema (inbound dedupe, link tokens, consent artefacts).
-- Apply after 0000_integration_hub_schema.sql

CREATE TABLE IF NOT EXISTS integration_hub.abdm_inbound_messages (
  iq_tenant_id uuid NOT NULL,
  request_id   text NOT NULL,
  flow_kind    text NOT NULL,
  received_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT abdm_inbound_messages_pkey PRIMARY KEY (iq_tenant_id, request_id)
);

CREATE TABLE IF NOT EXISTS integration_hub.abdm_link_tokens (
  iq_tenant_id        uuid NOT NULL,
  abha_address        text NOT NULL,
  link_token          text,
  expires_at          timestamptz,
  obtained_at         timestamptz,
  pending_request_id  text,
  pending_expires_at  timestamptz,
  CONSTRAINT abdm_link_tokens_pkey PRIMARY KEY (iq_tenant_id, abha_address)
);

CREATE TABLE IF NOT EXISTS integration_hub.abdm_consent_artefacts (
  iq_tenant_id      uuid NOT NULL,
  consent_id        text NOT NULL,
  patient_id        uuid NOT NULL,
  hip_id            text NOT NULL,
  hiu_id            text NOT NULL,
  status            text NOT NULL,
  data_erase_at     timestamptz NOT NULL,
  granted_at        timestamptz NOT NULL,
  artefact_json     jsonb NOT NULL,
  signature         text NOT NULL,
  signature_valid   boolean NOT NULL DEFAULT false,
  received_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT abdm_consent_artefacts_pkey PRIMARY KEY (iq_tenant_id, consent_id)
);

CREATE INDEX IF NOT EXISTS ix_abdm_consent_patient
  ON integration_hub.abdm_consent_artefacts (iq_tenant_id, patient_id);

CREATE INDEX IF NOT EXISTS ix_abdm_consent_data_erase
  ON integration_hub.abdm_consent_artefacts (data_erase_at)
  WHERE status = 'GRANTED';
