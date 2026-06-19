-- ABDM care-context CM link state (per ABHA; discovery filters already-linked contexts).
CREATE TABLE IF NOT EXISTS integration_hub.abdm_linked_care_contexts (
  iq_tenant_id     UUID NOT NULL,
  abha_address     TEXT NOT NULL,
  care_context_ref TEXT NOT NULL,
  linked_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT abdm_linked_care_contexts_pkey PRIMARY KEY (iq_tenant_id, abha_address, care_context_ref)
);

CREATE INDEX IF NOT EXISTS ix_abdm_linked_care_contexts_abha
  ON integration_hub.abdm_linked_care_contexts (iq_tenant_id, abha_address);
