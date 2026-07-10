-- Upgrade path from legacy pharmacy boot (walk-in + dispense_records + opd_queue_projection).
-- Idempotent: no-op on greenfield DBs that already ran rewritten 0000.

-- ═══════════════════════════════════════════════════════════════════════════════
-- A. Legacy dispense refactor (only when dispense_records still exists)
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
  IF to_regclass('pharmacy.dispense_records') IS NULL THEN
    RETURN;
  END IF;

  DELETE FROM pharmacy.dispense_line_items dli
  WHERE EXISTS (
    SELECT 1
    FROM pharmacy.dispense_records dr
    WHERE dr.iq_tenant_id = dli.iq_tenant_id
      AND dr.id = dli.dispense_record_id
      AND dr.walk_in_order = true
  );

  DELETE FROM pharmacy.dispense_records WHERE walk_in_order = true;

  ALTER TABLE pharmacy.dispense_records
    DROP CONSTRAINT IF EXISTS dispense_records_walk_in_patient_fk;

  ALTER TABLE pharmacy.dispense_records
    DROP CONSTRAINT IF EXISTS dispense_records_order_kind_chk;

  DROP INDEX IF EXISTS pharmacy.ix_pharmacy_dispense_records_walk_in_patient;

  ALTER TABLE pharmacy.dispense_records
    DROP COLUMN IF EXISTS walk_in_order,
    DROP COLUMN IF EXISTS walk_in_patient_id;

  DELETE FROM pharmacy.dispense_records
  WHERE visit_id IS NULL OR patient_id IS NULL;

  ALTER TABLE pharmacy.dispense_records
    ALTER COLUMN visit_id SET NOT NULL,
    ALTER COLUMN patient_id SET NOT NULL;

  ALTER TABLE pharmacy.dispense_records
    ADD COLUMN IF NOT EXISTS department_id uuid,
    ADD COLUMN IF NOT EXISTS branch_id uuid,
    ADD COLUMN IF NOT EXISTS inventory_store_id uuid,
    ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'routine',
    ADD COLUMN IF NOT EXISTS dispense_draft_json jsonb NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'dispense_records_priority_chk'
  ) THEN
    ALTER TABLE pharmacy.dispense_records
      ADD CONSTRAINT dispense_records_priority_chk
      CHECK (priority IN ('stat', 'urgent', 'routine'));
  END IF;

  DROP INDEX IF EXISTS pharmacy.uq_pharmacy_dispense_records_tenant_visit_opd;

  IF to_regclass('pharmacy.dispense') IS NULL THEN
    ALTER TABLE pharmacy.dispense_records RENAME TO dispense;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'dispense_records_pkey') THEN
    ALTER TABLE pharmacy.dispense RENAME CONSTRAINT dispense_records_pkey TO dispense_pkey;
  END IF;
END $$;

-- Line-item upgrades (idempotent on both legacy and greenfield)
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

DROP TABLE IF EXISTS pharmacy.walk_in_patients;

-- ═══════════════════════════════════════════════════════════════════════════════
-- B. opd_queue_projection → queue_projection (unified queue read model)
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
  IF to_regclass('pharmacy.opd_queue_projection') IS NOT NULL
     AND to_regclass('pharmacy.queue_projection') IS NULL THEN
    ALTER TABLE pharmacy.opd_queue_projection RENAME TO queue_projection;
  ELSIF to_regclass('pharmacy.opd_queue_projection') IS NOT NULL
     AND to_regclass('pharmacy.queue_projection') IS NOT NULL THEN
    -- Hybrid dev DB: rewritten 0000 created queue_projection while legacy table remains.
    INSERT INTO pharmacy.queue_projection (
      queue_item_id,
      iq_tenant_id,
      source_kind,
      source_ref_id,
      encounter_id,
      patient_id,
      prescription_id,
      doctor_id,
      visit_status,
      prescription_status,
      medicine_count,
      priority,
      queued_at,
      patient_name,
      uhid,
      phone,
      age_years,
      gender,
      doctor_name,
      formatted_visit_id,
      dispense_status,
      last_synced_at
    )
    SELECT
      gen_random_uuid(),
      oqp.iq_tenant_id,
      'opd',
      oqp.prescription_id,
      oqp.visit_id,
      oqp.patient_id,
      oqp.prescription_id,
      oqp.doctor_id,
      oqp.visit_status,
      oqp.prescription_status,
      oqp.medicine_count,
      'routine',
      oqp.queued_at,
      oqp.patient_name,
      oqp.uhid,
      oqp.phone,
      oqp.age_years,
      oqp.gender,
      oqp.doctor_name,
      oqp.formatted_visit_id,
      oqp.dispense_status,
      oqp.last_synced_at
    FROM pharmacy.opd_queue_projection oqp
    ON CONFLICT (iq_tenant_id, source_kind, source_ref_id) DO NOTHING;

    DROP TABLE pharmacy.opd_queue_projection;
  END IF;
END $$;

-- Greenfield 0000 already created queue_projection; legacy rows need new columns.
ALTER TABLE pharmacy.queue_projection
  ADD COLUMN IF NOT EXISTS queue_item_id uuid DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS source_kind text NOT NULL DEFAULT 'opd',
  ADD COLUMN IF NOT EXISTS source_ref_id uuid,
  ADD COLUMN IF NOT EXISTS encounter_id uuid,
  ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'routine',
  ADD COLUMN IF NOT EXISTS context_json jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Backfill from legacy visit_id / prescription_id columns when present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'pharmacy'
      AND table_name = 'queue_projection'
      AND column_name = 'visit_id'
  ) THEN
    EXECUTE $sql$
      UPDATE pharmacy.queue_projection
      SET source_ref_id = COALESCE(source_ref_id, prescription_id),
          encounter_id = COALESCE(encounter_id, visit_id)
      WHERE source_ref_id IS NULL OR encounter_id IS NULL
    $sql$;
  ELSE
    UPDATE pharmacy.queue_projection
    SET source_ref_id = COALESCE(source_ref_id, prescription_id),
        encounter_id = COALESCE(encounter_id, prescription_id)
    WHERE source_ref_id IS NULL OR encounter_id IS NULL;
  END IF;
END $$;

UPDATE pharmacy.queue_projection
SET queue_item_id = gen_random_uuid()
WHERE queue_item_id IS NULL;

ALTER TABLE pharmacy.queue_projection
  ALTER COLUMN queue_item_id SET NOT NULL,
  ALTER COLUMN source_ref_id SET NOT NULL,
  ALTER COLUMN encounter_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'queue_projection_source_kind_chk'
  ) THEN
    ALTER TABLE pharmacy.queue_projection
      ADD CONSTRAINT queue_projection_source_kind_chk
      CHECK (source_kind IN ('opd', 'ipd'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'queue_projection_priority_chk'
  ) THEN
    ALTER TABLE pharmacy.queue_projection
      ADD CONSTRAINT queue_projection_priority_chk
      CHECK (priority IN ('stat', 'urgent', 'routine'));
  END IF;
END $$;

-- Drop legacy PK on (tenant, visit_id) when migrating from opd_queue_projection
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON t.relnamespace = n.oid
    WHERE n.nspname = 'pharmacy'
      AND t.relname = 'queue_projection'
      AND c.conname = 'opd_queue_projection_pkey'
  ) THEN
    ALTER TABLE pharmacy.queue_projection DROP CONSTRAINT opd_queue_projection_pkey;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'queue_projection_pkey') THEN
    ALTER TABLE pharmacy.queue_projection
      ADD CONSTRAINT queue_projection_pkey PRIMARY KEY (iq_tenant_id, queue_item_id);
  END IF;
END $$;

ALTER TABLE pharmacy.queue_projection
  DROP COLUMN IF EXISTS visit_id;

DROP INDEX IF EXISTS pharmacy.ix_pharmacy_opd_queue_projection_tenant_status_queued;
DROP INDEX IF EXISTS pharmacy.ix_pharmacy_opd_queue_projection_tenant_queued;

CREATE UNIQUE INDEX IF NOT EXISTS uq_pharmacy_queue_projection_source
  ON pharmacy.queue_projection (iq_tenant_id, source_kind, source_ref_id);

CREATE INDEX IF NOT EXISTS ix_pharmacy_queue_projection_encounter
  ON pharmacy.queue_projection (iq_tenant_id, source_kind, encounter_id);

CREATE INDEX IF NOT EXISTS ix_pharmacy_queue_projection_tenant_kind_status_queued
  ON pharmacy.queue_projection (iq_tenant_id, source_kind, dispense_status, queued_at DESC);

CREATE INDEX IF NOT EXISTS ix_pharmacy_queue_projection_tenant_kind_queued
  ON pharmacy.queue_projection (iq_tenant_id, source_kind, queued_at DESC);
