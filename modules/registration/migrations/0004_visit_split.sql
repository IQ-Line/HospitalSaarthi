-- Split encounter fields from registration.registration into registration.visit.
-- Safe to re-run on dev DBs.

CREATE TABLE IF NOT EXISTS registration.visit (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  iq_tenant_id uuid NOT NULL,
  visit_id text NOT NULL,
  patient_id uuid NOT NULL,
  visit_type text,
  status varchar(32) NOT NULL DEFAULT 'pending',
  facility_id uuid,
  department_id uuid,
  doctor_id uuid,
  appointment_id uuid,
  idempotency_key text,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT visit_pkey PRIMARY KEY (iq_tenant_id, id),
  CONSTRAINT visit_status_chk CHECK (
    status IN ('pending', 'in_progress', 'completed', 'cancelled')
  )
);

CREATE INDEX IF NOT EXISTS idx_visit_patient
  ON registration.visit (iq_tenant_id, patient_id);

CREATE INDEX IF NOT EXISTS idx_visit_status
  ON registration.visit (iq_tenant_id, status);

CREATE UNIQUE INDEX IF NOT EXISTS uq_visit_idempotency
  ON registration.visit (iq_tenant_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- Dev DBs that ran an earlier 0004 have visit_id uuid PK and no id column.
-- CREATE TABLE IF NOT EXISTS above is a no-op; upgrade before backfill INSERT.
-- (0006_visit_id_format.sql repeats this block for idempotency.)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'registration'
      AND table_name = 'visit'
      AND column_name = 'visit_id'
      AND udt_name = 'uuid'
  ) THEN
    RETURN;
  END IF;

  ALTER TABLE registration.visit ADD COLUMN IF NOT EXISTS id uuid;

  UPDATE registration.visit SET id = visit_id WHERE id IS NULL;

  ALTER TABLE registration.visit ALTER COLUMN id SET NOT NULL;

  ALTER TABLE registration.visit ADD COLUMN IF NOT EXISTS visit_number text;

  UPDATE registration.visit
  SET visit_number = 'LEG-' || upper(replace(substr(id::text, 1, 13), '-', ''))
  WHERE visit_number IS NULL;

  ALTER TABLE registration.visit DROP CONSTRAINT IF EXISTS visit_pkey;

  ALTER TABLE registration.visit DROP COLUMN visit_id;

  ALTER TABLE registration.visit RENAME COLUMN visit_number TO visit_id;

  ALTER TABLE registration.visit ALTER COLUMN visit_id SET NOT NULL;

  ALTER TABLE registration.visit ADD CONSTRAINT visit_pkey PRIMARY KEY (iq_tenant_id, id);
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_visit_tenant_visit_id
  ON registration.visit (iq_tenant_id, visit_id);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'registration'
      AND table_name = 'registration'
      AND column_name = 'visit_type'
  ) THEN
    INSERT INTO registration.visit (
      id,
      visit_id,
      iq_tenant_id,
      patient_id,
      visit_type,
      status,
      facility_id,
      department_id,
      doctor_id,
      appointment_id,
      idempotency_key,
      created_by,
      updated_by,
      created_at,
      updated_at
    )
    SELECT
      COALESCE(r.visit_id, gen_random_uuid()),
      'LEG-' || upper(replace(substr(COALESCE(r.visit_id, gen_random_uuid())::text, 1, 13), '-', '')),
      r.iq_tenant_id,
      r.patient_id,
      r.visit_type,
      COALESCE(r.registration_status, 'pending'),
      r.facility_id,
      r.department_id,
      r.provider_id AS doctor_id,
      r.appointment_id,
      r.idempotency_key,
      r.created_by,
      r.updated_by,
      r.created_at,
      r.updated_at
    FROM registration.registration r
    WHERE NOT EXISTS (
      SELECT 1
      FROM registration.visit v
      WHERE v.iq_tenant_id = r.iq_tenant_id
        AND v.idempotency_key IS NOT NULL
        AND r.idempotency_key IS NOT NULL
        AND v.idempotency_key = r.idempotency_key
    );
  END IF;
END $$;

ALTER TABLE registration.registration
  DROP COLUMN IF EXISTS visit_id,
  DROP COLUMN IF EXISTS visit_type,
  DROP COLUMN IF EXISTS facility_id,
  DROP COLUMN IF EXISTS department_id,
  DROP COLUMN IF EXISTS provider_id,
  DROP COLUMN IF EXISTS appointment_id,
  DROP COLUMN IF EXISTS registration_status;

DROP INDEX IF EXISTS registration.idx_registration_visit;
DROP INDEX IF EXISTS registration.idx_registration_status;

DELETE FROM registration.registration r
USING registration.registration r2
WHERE r.iq_tenant_id = r2.iq_tenant_id
  AND r.patient_id = r2.patient_id
  AND r.created_at < r2.created_at;

CREATE UNIQUE INDEX IF NOT EXISTS uq_registration_patient
  ON registration.registration (iq_tenant_id, patient_id);

ALTER TABLE registration.registration DROP CONSTRAINT IF EXISTS registration_status_chk;

DO $$
BEGIN
  IF current_setting('citus.coordinator_node_count', true) IS NOT NULL THEN
    PERFORM create_distributed_table('registration.visit', 'iq_tenant_id');
  END IF;
END $$;
