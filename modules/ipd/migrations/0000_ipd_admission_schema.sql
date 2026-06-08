-- IPD Lite schema — wards, beds, episodes (aligned with docs/architecture/lld/ipd/01-schema-design.md).
-- Apply: psql "$DATABASE_URL" -f modules/ipd/migrations/0000_ipd_admission_schema.sql

CREATE SCHEMA IF NOT EXISTS ipd;

CREATE TABLE IF NOT EXISTS ipd.wards (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  iq_tenant_id uuid NOT NULL,
  ward_name text NOT NULL,
  ward_code text NOT NULL,
  ward_type text NOT NULL,
  floor text,
  specialty text,
  gender_restriction text NOT NULL DEFAULT 'any',
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT wards_pkey PRIMARY KEY (iq_tenant_id, id),
  CONSTRAINT wards_code_uq UNIQUE (iq_tenant_id, ward_code),
  CONSTRAINT wards_type_chk CHECK (
    ward_type IN ('general', 'semi_private', 'private', 'daycare', 'icu')
  ),
  CONSTRAINT wards_gender_chk CHECK (
    gender_restriction IN ('male', 'female', 'any', 'pediatric')
  )
);

CREATE INDEX IF NOT EXISTS idx_wards_type
  ON ipd.wards (iq_tenant_id, ward_type);

CREATE TABLE IF NOT EXISTS ipd.beds (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  iq_tenant_id uuid NOT NULL,
  ward_id uuid NOT NULL,
  room_number text,
  bed_number text NOT NULL,
  bed_code text NOT NULL,
  bed_type text NOT NULL DEFAULT 'general',
  bed_status text NOT NULL DEFAULT 'available',
  current_patient_id uuid,
  current_episode_id uuid,
  reserved_for_episode_id uuid,
  reserved_until timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT beds_pkey PRIMARY KEY (iq_tenant_id, id),
  CONSTRAINT beds_code_uq UNIQUE (iq_tenant_id, bed_code),
  CONSTRAINT beds_type_chk CHECK (
    bed_type IN ('general', 'isolation', 'private', 'deluxe', 'daycare')
  ),
  CONSTRAINT beds_status_chk CHECK (
    bed_status IN (
      'available',
      'reserved',
      'occupied',
      'cleaning_pending',
      'maintenance_blocked'
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_beds_ward_status
  ON ipd.beds (iq_tenant_id, ward_id, bed_status);

CREATE TABLE IF NOT EXISTS ipd.episodes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  iq_tenant_id uuid NOT NULL,
  episode_number text NOT NULL,
  visit_id uuid,
  patient_id uuid NOT NULL,
  patient_name text NOT NULL,
  admission_type text NOT NULL,
  admission_source text NOT NULL,
  status text NOT NULL DEFAULT 'scheduled',
  ward_id uuid,
  bed_id uuid,
  specialty_id uuid,
  attending_consultant_id uuid,
  provisional_diagnosis text,
  financial_class text NOT NULL DEFAULT 'general',
  deposit_amount numeric(18, 4),
  expected_los_days int,
  admitted_at timestamptz,
  discharged_at timestamptz,
  closure_type text,
  closure_reason text,
  idempotency_key text,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT episodes_pkey PRIMARY KEY (iq_tenant_id, id),
  CONSTRAINT episodes_number_uq UNIQUE (iq_tenant_id, episode_number),
  CONSTRAINT episodes_type_chk CHECK (
    admission_type IN ('planned', 'emergency', 'direct', 'transfer_in', 'daycare')
  ),
  CONSTRAINT episodes_source_chk CHECK (
    admission_source IN ('opd', 'emergency', 'referral', 'walk_in')
  ),
  CONSTRAINT episodes_status_chk CHECK (
    status IN (
      'scheduled',
      'admitted',
      'discharge_planning',
      'pending_clearance',
      'discharged',
      'cancelled'
    )
  ),
  CONSTRAINT episodes_financial_chk CHECK (
    financial_class IN ('general', 'private', 'insurance', 'sponsored')
  ),
  CONSTRAINT episodes_closure_chk CHECK (
    closure_type IS NULL OR closure_type IN ('normal', 'lama', 'dama', 'abscond', 'death')
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_episodes_idempotency
  ON ipd.episodes (iq_tenant_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_episodes_status
  ON ipd.episodes (iq_tenant_id, status);

CREATE INDEX IF NOT EXISTS idx_episodes_patient
  ON ipd.episodes (iq_tenant_id, patient_id);

CREATE INDEX IF NOT EXISTS idx_episodes_ward_status
  ON ipd.episodes (iq_tenant_id, ward_id, status);

CREATE INDEX IF NOT EXISTS idx_episodes_visit
  ON ipd.episodes (iq_tenant_id, visit_id)
  WHERE visit_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_episodes_visit
  ON ipd.episodes (iq_tenant_id, visit_id)
  WHERE visit_id IS NOT NULL;

DO $$
BEGIN
  IF current_setting('citus.coordinator_node_count', true) IS NOT NULL THEN
    PERFORM create_distributed_table('ipd.wards', 'iq_tenant_id');
    PERFORM create_distributed_table('ipd.beds', 'iq_tenant_id');
    PERFORM create_distributed_table('ipd.episodes', 'iq_tenant_id');
  END IF;
END $$;
