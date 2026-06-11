-- Pharmacy module — counter dispense, walk-in orders, OPD queue projection.
-- Idempotent boot DDL: never DROP live tables (data must survive service restarts).

CREATE SCHEMA IF NOT EXISTS pharmacy;

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

CREATE TABLE IF NOT EXISTS pharmacy.dispense_records (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  iq_tenant_id uuid NOT NULL,
  walk_in_order boolean NOT NULL DEFAULT false,
  walk_in_patient_id uuid,
  visit_id uuid,
  patient_id uuid,
  opd_prescription_id uuid,
  subtotal numeric(18, 4) NOT NULL DEFAULT 0,
  discount numeric(18, 4) NOT NULL DEFAULT 0,
  total_amount numeric(18, 4) NOT NULL DEFAULT 0,
  notes text,
  dispense_status text NOT NULL DEFAULT 'issued',
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  CONSTRAINT dispense_records_pkey PRIMARY KEY (iq_tenant_id, id),
  CONSTRAINT dispense_records_subtotal_nonneg_chk CHECK (subtotal >= 0),
  CONSTRAINT dispense_records_discount_nonneg_chk CHECK (discount >= 0),
  CONSTRAINT dispense_records_total_nonneg_chk CHECK (total_amount >= 0),
  CONSTRAINT dispense_records_dispense_status_check
    CHECK (dispense_status IN ('issued', 'partial_issue')),
  CONSTRAINT dispense_records_walk_in_patient_fk
    FOREIGN KEY (iq_tenant_id, walk_in_patient_id)
    REFERENCES pharmacy.walk_in_patients (iq_tenant_id, id)
    ON DELETE RESTRICT,
  CONSTRAINT dispense_records_order_kind_chk CHECK (
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
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_pharmacy_dispense_records_tenant_visit_opd
  ON pharmacy.dispense_records (iq_tenant_id, visit_id)
  WHERE walk_in_order = false AND visit_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_pharmacy_dispense_records_tenant_patient
  ON pharmacy.dispense_records (iq_tenant_id, patient_id)
  WHERE patient_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_pharmacy_dispense_records_walk_in_patient
  ON pharmacy.dispense_records (iq_tenant_id, walk_in_patient_id)
  WHERE walk_in_patient_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS pharmacy.dispense_line_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  iq_tenant_id uuid NOT NULL,
  dispense_record_id uuid NOT NULL,
  medicine_id uuid,
  medicine_display_name text NOT NULL,
  prescribed_quantity numeric(12, 4),
  quantity_dispensed numeric(12, 4) NOT NULL DEFAULT 0,
  unit_amount numeric(18, 4) NOT NULL DEFAULT 0,
  line_discount numeric(18, 4) NOT NULL DEFAULT 0,
  tax_percent numeric(8, 4) NOT NULL DEFAULT 0,
  tax_amount numeric(18, 4) NOT NULL DEFAULT 0,
  line_total numeric(18, 4) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT dispense_line_items_pkey PRIMARY KEY (iq_tenant_id, id),
  CONSTRAINT dispense_line_items_qty_nonneg_chk CHECK (quantity_dispensed >= 0),
  CONSTRAINT dispense_line_items_unit_amount_nonneg_chk CHECK (unit_amount >= 0),
  CONSTRAINT dispense_line_items_line_discount_nonneg_chk CHECK (line_discount >= 0),
  CONSTRAINT dispense_line_items_tax_percent_nonneg_chk CHECK (tax_percent >= 0),
  CONSTRAINT dispense_line_items_tax_amount_nonneg_chk CHECK (tax_amount >= 0),
  CONSTRAINT dispense_line_items_line_total_nonneg_chk CHECK (line_total >= 0),
  CONSTRAINT dispense_line_items_dispense_record_fk
    FOREIGN KEY (iq_tenant_id, dispense_record_id)
    REFERENCES pharmacy.dispense_records (iq_tenant_id, id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS ix_pharmacy_dispense_line_items_record
  ON pharmacy.dispense_line_items (iq_tenant_id, dispense_record_id);

CREATE INDEX IF NOT EXISTS ix_pharmacy_dispense_line_items_tenant_medicine
  ON pharmacy.dispense_line_items (iq_tenant_id, medicine_id)
  WHERE medicine_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS pharmacy.opd_queue_projection (
  visit_id uuid NOT NULL,
  iq_tenant_id uuid NOT NULL,
  patient_id uuid NOT NULL,
  prescription_id uuid NOT NULL,
  doctor_id uuid,
  visit_status text NOT NULL,
  prescription_status text NOT NULL,
  medicine_count integer NOT NULL DEFAULT 0,
  queued_at timestamptz NOT NULL,
  patient_name text,
  uhid text,
  phone text,
  age_years integer,
  gender text,
  doctor_name text,
  formatted_visit_id text,
  dispense_status text NOT NULL DEFAULT 'pending',
  last_synced_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT opd_queue_projection_pkey PRIMARY KEY (iq_tenant_id, visit_id),
  CONSTRAINT opd_queue_projection_dispense_status_check
    CHECK (dispense_status IN ('pending', 'issued', 'partial_issue')),
  CONSTRAINT opd_queue_projection_medicine_count_nonneg_chk CHECK (medicine_count >= 0)
);

CREATE INDEX IF NOT EXISTS ix_pharmacy_opd_queue_projection_tenant_status_queued
  ON pharmacy.opd_queue_projection (iq_tenant_id, dispense_status, queued_at DESC);

CREATE INDEX IF NOT EXISTS ix_pharmacy_opd_queue_projection_tenant_queued
  ON pharmacy.opd_queue_projection (iq_tenant_id, queued_at DESC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'dispense_line_items_dispense_record_fk'
  ) THEN
    ALTER TABLE pharmacy.dispense_line_items
      ADD CONSTRAINT dispense_line_items_dispense_record_fk
      FOREIGN KEY (iq_tenant_id, dispense_record_id)
      REFERENCES pharmacy.dispense_records (iq_tenant_id, id)
      ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF current_setting('citus.coordinator_node_count', true) IS NOT NULL THEN
    PERFORM create_distributed_table('pharmacy.walk_in_patients', 'iq_tenant_id');
    PERFORM create_distributed_table('pharmacy.dispense_records', 'iq_tenant_id');
    PERFORM create_distributed_table('pharmacy.dispense_line_items', 'iq_tenant_id');
    PERFORM create_distributed_table('pharmacy.opd_queue_projection', 'iq_tenant_id');
  END IF;
END $$;
