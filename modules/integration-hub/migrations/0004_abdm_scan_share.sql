-- ABDM scan-and-share token counter + issuances (registration desk queue).
CREATE TABLE IF NOT EXISTS integration_hub.abdm_share_tokens (
  iq_tenant_id       uuid NOT NULL,
  id                 uuid NOT NULL DEFAULT gen_random_uuid(),
  facility_id_ref    text NOT NULL,
  issue_date         text NOT NULL,
  next_token_number  smallint NOT NULL DEFAULT 1,
  created_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT abdm_share_tokens_pkey PRIMARY KEY (iq_tenant_id, id),
  CONSTRAINT uq_share_token_per_facility_day UNIQUE (iq_tenant_id, facility_id_ref, issue_date)
);

CREATE TABLE IF NOT EXISTS integration_hub.abdm_share_token_issuances (
  iq_tenant_id       uuid NOT NULL,
  id                 uuid NOT NULL DEFAULT gen_random_uuid(),
  facility_id_ref    text NOT NULL,
  issue_date         text NOT NULL,
  token_number       smallint NOT NULL,
  abha_address       text NOT NULL,
  patient_metadata   jsonb NOT NULL DEFAULT '{}',
  active             boolean NOT NULL DEFAULT true,
  issued_at          timestamptz NOT NULL DEFAULT now(),
  redeemed_at        timestamptz,
  updated_at         timestamptz NOT NULL DEFAULT now(),
  expires_at         timestamptz NOT NULL,
  CONSTRAINT abdm_share_token_issuances_pkey PRIMARY KEY (iq_tenant_id, id),
  CONSTRAINT uq_share_token_issuance UNIQUE (iq_tenant_id, facility_id_ref, issue_date, token_number)
);

CREATE INDEX IF NOT EXISTS ix_share_issuance_active
  ON integration_hub.abdm_share_token_issuances (iq_tenant_id, facility_id_ref, active, issued_at);

CREATE INDEX IF NOT EXISTS ix_share_issuance_abha
  ON integration_hub.abdm_share_token_issuances (iq_tenant_id, abha_address);
