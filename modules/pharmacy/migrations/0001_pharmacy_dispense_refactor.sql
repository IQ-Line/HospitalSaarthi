-- Pharmacy dispense refactor — OPD visit–linked dispense only (IQSandbox parity slice).
-- Drops walk_in_patients; renames dispense_records → dispense; enhances line items.
-- Idempotent: safe to run on every dev boot after 0000.
--
-- Queue patient identity: registration visit + EMPI patient (via opd_queue_projection snapshot).
-- Dispense header: one row per OPD visit (patient_id + visit_id required).

-- ─── 1. Remove walk-in dispense data (no EMPI patient link) ─────────────────

DELETE FROM pharmacy.dispense_line_items dli
WHERE EXISTS (
  SELECT 1
  FROM pharmacy.dispense_records dr
  WHERE dr.iq_tenant_id = dli.iq_tenant_id
    AND dr.id = dli.dispense_record_id
    AND dr.walk_in_order = true
);

DELETE FROM pharmacy.dispense_records
WHERE walk_in_order = true;

-- ─── 2. Drop walk-in columns and constraints on dispense_records ────────────

ALTER TABLE pharmacy.dispense_records
  DROP CONSTRAINT IF EXISTS dispense_records_walk_in_patient_fk;

ALTER TABLE pharmacy.dispense_records
  DROP CONSTRAINT IF EXISTS dispense_records_order_kind_chk;

DROP INDEX IF EXISTS pharmacy.ix_pharmacy_dispense_records_walk_in_patient;

ALTER TABLE pharmacy.dispense_records
  DROP COLUMN IF EXISTS walk_in_order,
  DROP COLUMN IF EXISTS walk_in_patient_id;

-- Remove orphan rows before NOT NULL enforcement
DELETE FROM pharmacy.dispense_records
WHERE visit_id IS NULL OR patient_id IS NULL;

ALTER TABLE pharmacy.dispense_records
  ALTER COLUMN visit_id SET NOT NULL,
  ALTER COLUMN patient_id SET NOT NULL;

-- ─── 3. Enhance dispense header (maps to IQSandbox pharmacy_workflow billing slice) ─

ALTER TABLE pharmacy.dispense_records
  ADD COLUMN IF NOT EXISTS department_id uuid,
  ADD COLUMN IF NOT EXISTS branch_id uuid,
  ADD COLUMN IF NOT EXISTS inventory_store_id uuid,
  ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'routine',
  ADD COLUMN IF NOT EXISTS dispense_draft_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'dispense_records_priority_chk'
  ) THEN
    ALTER TABLE pharmacy.dispense_records
      ADD CONSTRAINT dispense_records_priority_chk
      CHECK (priority IN ('stat', 'urgent', 'routine'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'dispense_records_visit_patient_chk'
  ) THEN
    ALTER TABLE pharmacy.dispense_records
      ADD CONSTRAINT dispense_records_visit_patient_chk
      CHECK (visit_id IS NOT NULL AND patient_id IS NOT NULL);
  END IF;
END $$;

DROP INDEX IF EXISTS pharmacy.uq_pharmacy_dispense_records_tenant_visit_opd;

CREATE UNIQUE INDEX IF NOT EXISTS uq_pharmacy_dispense_tenant_visit
  ON pharmacy.dispense_records (iq_tenant_id, visit_id);

CREATE INDEX IF NOT EXISTS ix_pharmacy_dispense_tenant_patient
  ON pharmacy.dispense_records (iq_tenant_id, patient_id);

CREATE INDEX IF NOT EXISTS ix_pharmacy_dispense_tenant_prescription
  ON pharmacy.dispense_records (iq_tenant_id, opd_prescription_id)
  WHERE opd_prescription_id IS NOT NULL;

-- ─── 4. Rename header table dispense_records → dispense ─────────────────────

DO $$
BEGIN
  IF to_regclass('pharmacy.dispense_records') IS NOT NULL
     AND to_regclass('pharmacy.dispense') IS NULL THEN
    ALTER TABLE pharmacy.dispense_records RENAME TO dispense;
  END IF;
END $$;

-- Rename constraints for clarity (best-effort; names may already match on fresh installs)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'dispense_records_pkey') THEN
    ALTER TABLE pharmacy.dispense RENAME CONSTRAINT dispense_records_pkey TO dispense_pkey;
  END IF;
END $$;

-- ─── 5. Enhance dispense_line_items (maps to IQSandbox pharmacy_dispense_lines) ─

ALTER TABLE pharmacy.dispense_line_items
  DROP CONSTRAINT IF EXISTS dispense_line_items_dispense_record_fk;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'pharmacy'
      AND table_name = 'dispense_line_items'
      AND column_name = 'dispense_record_id'
  ) THEN
    ALTER TABLE pharmacy.dispense_line_items
      RENAME COLUMN dispense_record_id TO dispense_id;
  END IF;
END $$;

ALTER TABLE pharmacy.dispense_line_items
  ADD COLUMN IF NOT EXISTS opd_prescription_item_id uuid,
  ADD COLUMN IF NOT EXISTS opd_prescription_line_no integer,
  ADD COLUMN IF NOT EXISTS stock_batch_id uuid,
  ADD COLUMN IF NOT EXISTS is_substitution boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS substitute_of_line_id uuid,
  ADD COLUMN IF NOT EXISTS substitution_reason text,
  ADD COLUMN IF NOT EXISTS line_remarks text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'dispense_line_items_dispense_fk'
  ) THEN
    ALTER TABLE pharmacy.dispense_line_items
      ADD CONSTRAINT dispense_line_items_dispense_fk
      FOREIGN KEY (iq_tenant_id, dispense_id)
      REFERENCES pharmacy.dispense (iq_tenant_id, id)
      ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'dispense_line_items_substitute_fk'
  ) THEN
    ALTER TABLE pharmacy.dispense_line_items
      ADD CONSTRAINT dispense_line_items_substitute_fk
      FOREIGN KEY (iq_tenant_id, substitute_of_line_id)
      REFERENCES pharmacy.dispense_line_items (iq_tenant_id, id)
      ON DELETE SET NULL;
  END IF;
END $$;

DROP INDEX IF EXISTS pharmacy.ix_pharmacy_dispense_line_items_record;

CREATE INDEX IF NOT EXISTS ix_pharmacy_dispense_line_items_dispense
  ON pharmacy.dispense_line_items (iq_tenant_id, dispense_id);

CREATE INDEX IF NOT EXISTS ix_pharmacy_dispense_line_items_prescription_item
  ON pharmacy.dispense_line_items (iq_tenant_id, opd_prescription_item_id)
  WHERE opd_prescription_item_id IS NOT NULL;

-- ─── 6. Drop walk-in patient registry ───────────────────────────────────────

DROP TABLE IF EXISTS pharmacy.walk_in_patients;
