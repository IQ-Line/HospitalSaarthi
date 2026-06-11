-- IPD vital signs — parameterized EAV rows grouped by check_in_id (LLD §5).
-- Apply after 0001_clinical_notes.sql

CREATE TABLE IF NOT EXISTS ipd.vital_signs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  iq_tenant_id uuid NOT NULL,
  episode_id uuid NOT NULL,
  check_in_id uuid NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  vital_code text NOT NULL,
  vital_name text NOT NULL,
  data_type text NOT NULL,
  value_numeric numeric,
  value_text text,
  unit text,
  recorded_by uuid NOT NULL,
  notes text,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT vital_signs_pkey PRIMARY KEY (iq_tenant_id, id),
  CONSTRAINT vital_signs_data_type_chk CHECK (
    data_type IN ('numeric', 'text', 'boolean', 'score')
  )
);

CREATE INDEX IF NOT EXISTS idx_vital_signs_episode_check_in
  ON ipd.vital_signs (iq_tenant_id, episode_id, check_in_id);

CREATE INDEX IF NOT EXISTS idx_vital_signs_episode_recorded
  ON ipd.vital_signs (iq_tenant_id, episode_id, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_vital_signs_check_in
  ON ipd.vital_signs (iq_tenant_id, check_in_id);
