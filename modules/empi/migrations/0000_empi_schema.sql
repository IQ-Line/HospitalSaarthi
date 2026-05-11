-- EMPI schema — aligned with modules/empi/src/schema/tables.ts (Drizzle).
-- Apply 0000 then 0001_pg_trgm.sql (extension + GIN name index).
--   psql "$DATABASE_URL" -f modules/empi/migrations/0000_empi_schema.sql
--   psql "$DATABASE_URL" -f modules/empi/migrations/0001_pg_trgm.sql
-- Requires PostgreSQL 13+ (gen_random_uuid).

CREATE SCHEMA IF NOT EXISTS empi;

-- ─── patients ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS empi.patients (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  iq_tenant_id uuid NOT NULL,
  uhid text NOT NULL,
  abha_number text,
  salutation text,
  first_name text NOT NULL,
  middle_name text,
  last_name text,
  full_name text NOT NULL,
  father_name text,
  mother_name text,
  date_of_birth date,
  year_of_birth smallint,
  age_years smallint,
  age_months smallint,
  age_days smallint,
  gender text NOT NULL,
  phone_number text NOT NULL,
  alternate_phone text,
  blood_group text,
  occupation text,
  nationality text NOT NULL DEFAULT 'Indian',
  education text,
  emergency_contact_name text,
  emergency_contact_relationship text,
  emergency_contact_phone text,
  status text NOT NULL DEFAULT 'active',
  merged_into_id uuid,
  registered_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  CONSTRAINT patients_pkey PRIMARY KEY (iq_tenant_id, id),
  CONSTRAINT uq_patients_tenant_uhid UNIQUE (iq_tenant_id, uhid),
  CONSTRAINT uq_patients_tenant_abha UNIQUE (iq_tenant_id, abha_number)
);

CREATE INDEX IF NOT EXISTS idx_patients_phone ON empi.patients (iq_tenant_id, phone_number);
-- full_name search uses pg_trgm GIN index (see 0001_pg_trgm.sql)
CREATE INDEX IF NOT EXISTS idx_patients_status ON empi.patients (iq_tenant_id, status);

-- ─── patient_source_records ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS empi.patient_source_records (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  iq_tenant_id uuid NOT NULL,
  patient_id uuid NOT NULL,
  source_system text NOT NULL,
  source_reference text,
  demographics_snapshot jsonb NOT NULL,
  contributed_at timestamptz NOT NULL DEFAULT now(),
  contributed_by uuid,
  CONSTRAINT patient_source_records_pkey PRIMARY KEY (iq_tenant_id, id)
);

CREATE INDEX IF NOT EXISTS idx_source_records_patient ON empi.patient_source_records (iq_tenant_id, patient_id);

-- ─── patient_identifiers ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS empi.patient_identifiers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  iq_tenant_id uuid NOT NULL,
  patient_id uuid NOT NULL,
  identifier_type text NOT NULL,
  identifier_value text NOT NULL,
  issuing_system text,
  source_record_id uuid,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  CONSTRAINT patient_identifiers_pkey PRIMARY KEY (iq_tenant_id, id),
  CONSTRAINT uq_identifiers_type_value UNIQUE (iq_tenant_id, identifier_type, identifier_value)
);

CREATE INDEX IF NOT EXISTS idx_identifiers_patient ON empi.patient_identifiers (iq_tenant_id, patient_id);

-- ─── patient_addresses ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS empi.patient_addresses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  iq_tenant_id uuid NOT NULL,
  patient_id uuid NOT NULL,
  address_type text NOT NULL,
  street text,
  city text,
  district text,
  state text,
  pincode text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  CONSTRAINT patient_addresses_pkey PRIMARY KEY (iq_tenant_id, id)
);

CREATE INDEX IF NOT EXISTS idx_addresses_patient ON empi.patient_addresses (iq_tenant_id, patient_id);

-- ─── sequence_counters ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS empi.sequence_counters (
  iq_tenant_id uuid NOT NULL,
  sequence_name text NOT NULL,
  current_value bigint NOT NULL DEFAULT 0,
  CONSTRAINT sequence_counters_pkey PRIMARY KEY (iq_tenant_id, sequence_name)
);

-- ─── match_candidates (MVP schema only) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS empi.match_candidates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  iq_tenant_id uuid NOT NULL,
  patient_a_id uuid NOT NULL,
  patient_b_id uuid NOT NULL,
  match_score numeric(5, 4) NOT NULL,
  match_algorithm text NOT NULL,
  blocking_keys_matched text[],
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT match_candidates_pkey PRIMARY KEY (iq_tenant_id, id)
);

CREATE INDEX IF NOT EXISTS idx_match_candidates_pending ON empi.match_candidates (iq_tenant_id, status);

-- ─── merge_history (MVP schema only) ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS empi.merge_history (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  iq_tenant_id uuid NOT NULL,
  surviving_patient_id uuid NOT NULL,
  merged_patient_id uuid NOT NULL,
  merge_reason text,
  pre_merge_snapshot jsonb NOT NULL,
  merged_by uuid NOT NULL,
  merged_at timestamptz NOT NULL DEFAULT now(),
  unmerged_at timestamptz,
  unmerged_by uuid,
  CONSTRAINT merge_history_pkey PRIMARY KEY (iq_tenant_id, id)
);

CREATE INDEX IF NOT EXISTS idx_merge_history_surviving ON empi.merge_history (iq_tenant_id, surviving_patient_id);
CREATE INDEX IF NOT EXISTS idx_merge_history_merged ON empi.merge_history (iq_tenant_id, merged_patient_id);
