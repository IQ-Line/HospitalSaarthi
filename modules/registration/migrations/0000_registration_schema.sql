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
  -- TODO(master-data): reference visit_types catalog (opd_first, opd_follow_up, ipd_admission, emergency, daycare)
  visit_type text,
  department_id uuid,
  provider_id uuid,
  appointment_id uuid,
  registration_status varchar(32) NOT NULL DEFAULT 'pending',
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT registration_pkey PRIMARY KEY (iq_tenant_id, registration_id),
  CONSTRAINT registration_status_chk CHECK (registration_status IN ('pending'))
);

CREATE INDEX IF NOT EXISTS idx_registration_patient ON registration.registration (iq_tenant_id, patient_id);
CREATE INDEX IF NOT EXISTS idx_registration_visit ON registration.registration (iq_tenant_id, visit_id);
CREATE INDEX IF NOT EXISTS idx_registration_status ON registration.registration (iq_tenant_id, registration_status);

-- idempotency_key + uq_registration_idempotency: see 0001_registration_hardening.sql
-- (avoids failing when an older registration.registration row exists without that column)

-- Citus distribution (no-op when Citus coordinator is not present)
DO $$
BEGIN
  IF current_setting('citus.coordinator_node_count', true) IS NOT NULL THEN
    PERFORM create_distributed_table('registration.registration', 'iq_tenant_id');
  END IF;
END $$;
