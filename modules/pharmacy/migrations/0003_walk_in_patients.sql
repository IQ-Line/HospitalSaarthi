-- Walk-in pharmacy patients and walk-in dispense orders (no OPD visit / EMPI patient).

CREATE TABLE IF NOT EXISTS pharmacy.walk_in_patients (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  iq_tenant_id uuid NOT NULL,
  first_name text NOT NULL,
  last_name text,
  phone text,
  gender text NOT NULL,
  date_of_birth date,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT walk_in_patients_pkey PRIMARY KEY (iq_tenant_id, id),
  CONSTRAINT walk_in_patients_first_name_nonempty_chk CHECK (length(trim(first_name)) > 0),
  CONSTRAINT walk_in_patients_gender_chk CHECK (gender IN ('male', 'female', 'other'))
);

CREATE INDEX IF NOT EXISTS ix_pharmacy_walk_in_patients_tenant_created
  ON pharmacy.walk_in_patients (iq_tenant_id, created_at DESC);

ALTER TABLE pharmacy.dispense_records
  ADD COLUMN IF NOT EXISTS walk_in_order boolean NOT NULL DEFAULT false;

ALTER TABLE pharmacy.dispense_records
  ADD COLUMN IF NOT EXISTS walk_in_patient_id uuid;

ALTER TABLE pharmacy.dispense_records
  ALTER COLUMN visit_id DROP NOT NULL;

ALTER TABLE pharmacy.dispense_records
  ALTER COLUMN patient_id DROP NOT NULL;

DROP INDEX IF EXISTS uq_pharmacy_dispense_records_tenant_visit;

CREATE UNIQUE INDEX IF NOT EXISTS uq_pharmacy_dispense_records_tenant_visit_opd
  ON pharmacy.dispense_records (iq_tenant_id, visit_id)
  WHERE walk_in_order = false AND visit_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_pharmacy_dispense_records_walk_in_patient
  ON pharmacy.dispense_records (iq_tenant_id, walk_in_patient_id)
  WHERE walk_in_patient_id IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'dispense_records_walk_in_patient_fk'
  ) THEN
    ALTER TABLE pharmacy.dispense_records
      ADD CONSTRAINT dispense_records_walk_in_patient_fk
      FOREIGN KEY (iq_tenant_id, walk_in_patient_id)
      REFERENCES pharmacy.walk_in_patients (iq_tenant_id, id)
      ON DELETE RESTRICT;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'dispense_records_order_kind_chk'
  ) THEN
    ALTER TABLE pharmacy.dispense_records
      ADD CONSTRAINT dispense_records_order_kind_chk CHECK (
        (
          walk_in_order = true
          AND walk_in_patient_id IS NOT NULL
          AND visit_id IS NULL
          AND patient_id IS NULL
          AND opd_prescription_id IS NULL
        )
        OR (
          walk_in_order = false
          AND walk_in_patient_id IS NULL
          AND visit_id IS NOT NULL
          AND patient_id IS NOT NULL
        )
      );
  END IF;
END $$;
