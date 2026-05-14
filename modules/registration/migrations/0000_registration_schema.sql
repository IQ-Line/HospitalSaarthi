-- Registration module schema — aligned with modules/registration/src/schema/tables.ts (Drizzle).
-- Apply: psql "$DATABASE_URL" -f modules/registration/migrations/0000_registration_schema.sql
-- Requires PostgreSQL 13+ (gen_random_uuid). Citus: distribute by iq_tenant_id when coordinator is configured.

CREATE SCHEMA IF NOT EXISTS registration;

CREATE TABLE IF NOT EXISTS registration.registration (
  registration_id uuid NOT NULL DEFAULT gen_random_uuid(),
  iq_tenant_id uuid NOT NULL,
  visit_id uuid,
  patient_id uuid NOT NULL,
  facility_id uuid,
  visit_type text,
  department_id uuid,
  provider_id uuid,
  appointment_id uuid,
  registration_status text NOT NULL DEFAULT 'pending',
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT registration_pkey PRIMARY KEY (iq_tenant_id, registration_id)
);

CREATE INDEX IF NOT EXISTS idx_registration_patient ON registration.registration (iq_tenant_id, patient_id);
CREATE INDEX IF NOT EXISTS idx_registration_visit ON registration.registration (iq_tenant_id, visit_id);
CREATE INDEX IF NOT EXISTS idx_registration_status ON registration.registration (iq_tenant_id, registration_status);
