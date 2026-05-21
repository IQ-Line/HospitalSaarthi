-- ABDM user-initiated link OTP (multi-pod safe; hash at rest).
CREATE TABLE IF NOT EXISTS abdm_adapter.abdm_link_otps (
  iq_tenant_id     uuid NOT NULL,
  link_ref_number  text NOT NULL,
  otp_hash         text NOT NULL,
  expires_at       timestamptz NOT NULL,
  attempts         smallint NOT NULL DEFAULT 0,
  created_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT abdm_link_otps_pkey PRIMARY KEY (iq_tenant_id, link_ref_number)
);

CREATE INDEX IF NOT EXISTS ix_abdm_link_otps_expires
  ON abdm_adapter.abdm_link_otps (expires_at);
