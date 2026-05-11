-- Repair: sequence_counters must exist with PK (iq_tenant_id, sequence_name) for UHID upsert.
-- Apply after 0000 if the table was never created or was created without the constraint.
--   psql "$DATABASE_URL" -f modules/empi/migrations/0002_ensure_sequence_counters.sql

CREATE TABLE IF NOT EXISTS empi.sequence_counters (
  iq_tenant_id uuid NOT NULL,
  sequence_name text NOT NULL,
  current_value bigint NOT NULL DEFAULT 0
);

DO $$
BEGIN
  ALTER TABLE empi.sequence_counters
    ADD CONSTRAINT sequence_counters_pkey PRIMARY KEY (iq_tenant_id, sequence_name);
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END $$;
