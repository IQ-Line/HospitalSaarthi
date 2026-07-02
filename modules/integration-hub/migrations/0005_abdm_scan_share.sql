-- ABDM scan-and-share token counter + issuances (registration desk queue).
-- Apply after prior integration_hub migrations.

CREATE TABLE IF NOT EXISTS integration_hub.abdm_share_tokens (
  id                 uuid NOT NULL DEFAULT gen_random_uuid(),
  iq_tenant_id       uuid NOT NULL,
  integration_id     uuid NOT NULL,
  facility_id_ref    text NOT NULL,
  issue_date         date NOT NULL DEFAULT (current_date AT TIME ZONE 'Asia/Kolkata')::date,
  next_token_number  integer NOT NULL DEFAULT 1,
  created_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT abdm_share_tokens_pkey PRIMARY KEY (iq_tenant_id, id),
  CONSTRAINT uq_share_token_per_facility_day UNIQUE (iq_tenant_id, facility_id_ref, issue_date)
);

CREATE TABLE IF NOT EXISTS integration_hub.abdm_share_token_issuances (
  id               uuid NOT NULL DEFAULT gen_random_uuid(),
  iq_tenant_id     uuid NOT NULL,
  integration_id   uuid NOT NULL,
  facility_id_ref  text NOT NULL,
  issue_date       date NOT NULL DEFAULT (current_date AT TIME ZONE 'Asia/Kolkata')::date,
  token_number     integer NOT NULL,
  patient_id       uuid,
  abha_address     text NOT NULL,
  profile_json     jsonb NOT NULL DEFAULT '{}'::jsonb,
  issued_at        timestamptz NOT NULL DEFAULT now(),
  redeemed_at      timestamptz,
  expires_at       timestamptz NOT NULL,
  active           boolean NOT NULL DEFAULT true,
  CONSTRAINT abdm_share_token_issuances_pkey PRIMARY KEY (iq_tenant_id, id),
  CONSTRAINT uq_share_token_issuance UNIQUE (iq_tenant_id, facility_id_ref, issue_date, token_number)
);

CREATE INDEX IF NOT EXISTS idx_share_issuance_abha
  ON integration_hub.abdm_share_token_issuances (iq_tenant_id, abha_address);

CREATE INDEX IF NOT EXISTS idx_share_issuance_active
  ON integration_hub.abdm_share_token_issuances (iq_tenant_id, facility_id_ref, issue_date, active)
  WHERE redeemed_at IS NULL;
