-- IPD admission intake — admission table only.
-- Apply: psql "$DATABASE_URL" -f modules/ipd/migrations/0000_ipd_admission_schema.sql
-- Bed board / bed catalog is a separate workflow — ward/bed labels stored as text on admission.

CREATE SCHEMA IF NOT EXISTS ipd;

CREATE TABLE IF NOT EXISTS ipd.admission (
  admission_id uuid NOT NULL DEFAULT gen_random_uuid(),
  iq_tenant_id uuid NOT NULL,
  admission_number text NOT NULL,

  patient_id uuid NOT NULL,
  registration_visit_id uuid,
  source_visit_id uuid,

  admission_type text NOT NULL DEFAULT 'IPD',
  admission_source text NOT NULL,

  facility_id uuid NOT NULL,
  department_id uuid,
  intended_ward_code text,
  admitting_doctor_id uuid,
  attending_doctor_id uuid,

  status text NOT NULL DEFAULT 'draft',

  admission_datetime timestamptz,
  expected_discharge_date date,

  chief_complaint text,
  provisional_diagnosis text,
  payer_type text NOT NULL DEFAULT 'self',
  insurance_reference text,
  companion_name text,
  companion_phone text,
  remarks text,
  mother_admission_id uuid,

  deposit_required boolean NOT NULL DEFAULT false,
  deposit_amount numeric(12, 2),
  deposit_bill_id uuid,
  deposit_collected_at timestamptz,

  ward_code text,
  ward_name text,
  bed_label text,
  bed_assigned_at timestamptz,

  patient_uhid text NOT NULL,
  patient_full_name text NOT NULL,
  patient_phone text,
  patient_gender text,
  patient_date_of_birth date,

  cancel_reason text,
  idempotency_key text,

  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT admission_pkey PRIMARY KEY (iq_tenant_id, admission_id),
  CONSTRAINT admission_number_uq UNIQUE (iq_tenant_id, admission_number),
  CONSTRAINT admission_type_chk CHECK (admission_type IN ('IPD', 'DAYCARE')),
  CONSTRAINT admission_source_chk CHECK (
    admission_source IN ('OPD', 'EMERGENCY', 'DIRECT', 'BABY_CRADLE')
  ),
  CONSTRAINT admission_status_chk CHECK (
    status IN ('draft', 'pending', 'active', 'cancelled', 'discharged')
  ),
  CONSTRAINT admission_payer_chk CHECK (
    payer_type IN ('self', 'insurance', 'corporate', 'government')
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_admission_idempotency
  ON ipd.admission (iq_tenant_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_admission_registration_visit
  ON ipd.admission (iq_tenant_id, registration_visit_id)
  WHERE registration_visit_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_admission_queue
  ON ipd.admission (iq_tenant_id, status, updated_at DESC)
  WHERE status IN ('draft', 'pending', 'active');

CREATE INDEX IF NOT EXISTS idx_admission_patient
  ON ipd.admission (iq_tenant_id, patient_id);

CREATE INDEX IF NOT EXISTS idx_admission_admitted_today
  ON ipd.admission (iq_tenant_id, admission_datetime)
  WHERE status IN ('active', 'discharged');

DO $$
BEGIN
  IF current_setting('citus.coordinator_node_count', true) IS NOT NULL THEN
    PERFORM create_distributed_table('ipd.admission', 'iq_tenant_id');
  END IF;
END $$;
