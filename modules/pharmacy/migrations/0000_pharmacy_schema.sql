-- Pharmacy module — counter dispense + manual billing (simplified v1).
-- OPD prescription is read via API; only dispense snapshot is stored here.
-- Idempotent boot DDL: never DROP live tables (data must survive service restarts).

CREATE SCHEMA IF NOT EXISTS pharmacy;

CREATE TABLE IF NOT EXISTS pharmacy.dispense_records (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  iq_tenant_id uuid NOT NULL,
  visit_id uuid NOT NULL,
  patient_id uuid NOT NULL,
  opd_prescription_id uuid,
  subtotal numeric(18, 4) NOT NULL DEFAULT 0,
  discount numeric(18, 4) NOT NULL DEFAULT 0,
  total_amount numeric(18, 4) NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  CONSTRAINT dispense_records_pkey PRIMARY KEY (iq_tenant_id, id),
  CONSTRAINT dispense_records_subtotal_nonneg_chk CHECK (subtotal >= 0),
  CONSTRAINT dispense_records_discount_nonneg_chk CHECK (discount >= 0),
  CONSTRAINT dispense_records_total_nonneg_chk CHECK (total_amount >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_pharmacy_dispense_records_tenant_visit
  ON pharmacy.dispense_records (iq_tenant_id, visit_id);

CREATE INDEX IF NOT EXISTS ix_pharmacy_dispense_records_tenant_patient
  ON pharmacy.dispense_records (iq_tenant_id, patient_id);

CREATE TABLE IF NOT EXISTS pharmacy.dispense_line_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  iq_tenant_id uuid NOT NULL,
  dispense_record_id uuid NOT NULL,
  medicine_display_name text NOT NULL,
  prescribed_quantity numeric(12, 4),
  quantity_dispensed numeric(12, 4) NOT NULL DEFAULT 0,
  unit_amount numeric(18, 4) NOT NULL DEFAULT 0,
  line_total numeric(18, 4) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT dispense_line_items_pkey PRIMARY KEY (iq_tenant_id, id),
  CONSTRAINT dispense_line_items_qty_nonneg_chk CHECK (quantity_dispensed >= 0),
  CONSTRAINT dispense_line_items_unit_amount_nonneg_chk CHECK (unit_amount >= 0),
  CONSTRAINT dispense_line_items_line_total_nonneg_chk CHECK (line_total >= 0)
);

CREATE INDEX IF NOT EXISTS ix_pharmacy_dispense_line_items_record
  ON pharmacy.dispense_line_items (iq_tenant_id, dispense_record_id);
