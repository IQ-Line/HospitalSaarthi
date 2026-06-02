-- Registration module schema — patient snapshot root (encounters live in registration.visit).
-- Apply: psql "$DATABASE_URL" -f modules/registration/migrations/0000_registration_schema.sql
-- Requires PostgreSQL 13+ (gen_random_uuid). Citus: distribute by iq_tenant_id when coordinator is configured.

CREATE SCHEMA IF NOT EXISTS registration;

CREATE TABLE IF NOT EXISTS registration.registration (
  registration_id uuid NOT NULL DEFAULT gen_random_uuid(),
  iq_tenant_id uuid NOT NULL,
  patient_id uuid NOT NULL,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT registration_pkey PRIMARY KEY (iq_tenant_id, registration_id)
);

-- Older dev/POC databases may already have registration.registration from a
-- pre-0000 revision. CREATE TABLE IF NOT EXISTS will not backfill columns, so
-- add the columns referenced by this baseline before creating indexes.
ALTER TABLE registration.registration
  ADD COLUMN IF NOT EXISTS visit_id uuid,
  ADD COLUMN IF NOT EXISTS facility_id uuid,
  ADD COLUMN IF NOT EXISTS visit_type text,
  ADD COLUMN IF NOT EXISTS department_id uuid,
  ADD COLUMN IF NOT EXISTS provider_id uuid,
  ADD COLUMN IF NOT EXISTS appointment_id uuid,
  ADD COLUMN IF NOT EXISTS registration_status varchar(32) NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS updated_by uuid,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_registration_patient ON registration.registration (iq_tenant_id, patient_id);

-- idempotency_key: 0001. Patient snapshot columns: 0002. Visit rows: 0004.

DO $$
BEGIN
  IF current_setting('citus.coordinator_node_count', true) IS NOT NULL THEN
    PERFORM create_distributed_table('registration.registration', 'iq_tenant_id');
  END IF;
END $$;
