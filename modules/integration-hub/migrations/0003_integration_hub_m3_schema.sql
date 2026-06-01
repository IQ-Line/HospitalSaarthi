-- ABDM Adapter — M3 schema (HIU consent requests, HIU artefacts, data transfers).
-- Apply after 0002_abdm_link_otps.sql

CREATE TABLE IF NOT EXISTS integration_hub.abdm_m3_consent_requests (
  iq_tenant_id           uuid NOT NULL,
  consent_request_id     text NOT NULL,
  session_id             uuid NOT NULL,
  patient_abha_address   text NOT NULL,
  hip_id                 text,
  purpose_code           text NOT NULL,
  hi_types               text[] NOT NULL,
  permission_date_from   timestamptz NOT NULL,
  permission_date_to     timestamptz NOT NULL,
  data_erase_at          timestamptz NOT NULL,
  state                  text NOT NULL,
  consent_artefact_ids   text[] NOT NULL DEFAULT '{}',
  context                jsonb NOT NULL DEFAULT '{}',
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT abdm_m3_consent_requests_pkey PRIMARY KEY (iq_tenant_id, consent_request_id)
);

CREATE INDEX IF NOT EXISTS ix_m3_consent_requests_session
  ON integration_hub.abdm_m3_consent_requests (iq_tenant_id, session_id);
CREATE INDEX IF NOT EXISTS ix_m3_consent_requests_state
  ON integration_hub.abdm_m3_consent_requests (iq_tenant_id, state);

CREATE TABLE IF NOT EXISTS integration_hub.abdm_m3_consent_artefacts_hiu (
  iq_tenant_id           uuid NOT NULL,
  consent_id             text NOT NULL,
  consent_request_id     text NOT NULL,
  patient_abha_address   text NOT NULL,
  hip_id                 text NOT NULL,
  status                 text NOT NULL,
  data_erase_at          timestamptz NOT NULL,
  granted_at             timestamptz NOT NULL,
  hi_types               text[] NOT NULL,
  care_contexts          jsonb NOT NULL,
  artefact_json          jsonb NOT NULL,
  signature              text NOT NULL,
  signature_valid        boolean NOT NULL DEFAULT false,
  received_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT abdm_m3_consent_artefacts_hiu_pkey PRIMARY KEY (iq_tenant_id, consent_id)
);

CREATE INDEX IF NOT EXISTS ix_m3_artefacts_hiu_patient
  ON integration_hub.abdm_m3_consent_artefacts_hiu (iq_tenant_id, patient_abha_address);
CREATE INDEX IF NOT EXISTS ix_m3_artefacts_hiu_request
  ON integration_hub.abdm_m3_consent_artefacts_hiu (iq_tenant_id, consent_request_id);

CREATE TABLE IF NOT EXISTS integration_hub.abdm_m3_data_transfers (
  iq_tenant_id            uuid NOT NULL,
  transfer_id             uuid NOT NULL,
  session_id              uuid,
  flow_kind               text NOT NULL DEFAULT 'abdm.m3.hiu.v1',
  state                   text NOT NULL,
  consent_id              text NOT NULL,
  outbound_request_id     text,
  cm_transaction_id       text,
  hiu_private_key_jwk     text NOT NULL,
  hiu_public_key_b64      text NOT NULL,
  hiu_nonce_b64           text NOT NULL,
  hip_public_key_b64      text,
  hip_nonce_b64           text,
  data_push_url           text NOT NULL,
  bundle_json             jsonb,
  error                   jsonb,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  awaiting_push_until     timestamptz,
  CONSTRAINT abdm_m3_data_transfers_pkey PRIMARY KEY (iq_tenant_id, transfer_id)
);

CREATE INDEX IF NOT EXISTS ix_m3_transfers_consent
  ON integration_hub.abdm_m3_data_transfers (iq_tenant_id, consent_id);
CREATE INDEX IF NOT EXISTS ix_m3_transfers_txn
  ON integration_hub.abdm_m3_data_transfers (iq_tenant_id, cm_transaction_id);
CREATE INDEX IF NOT EXISTS ix_m3_transfers_awaiting
  ON integration_hub.abdm_m3_data_transfers (awaiting_push_until)
  WHERE state = 'AWAITING_PUSH';
