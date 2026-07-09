-- Pharmacy module — OPD dispense + unified queue projection (greenfield).
-- Idempotent boot DDL: never DROP live tables (data must survive service restarts).

CREATE SCHEMA IF NOT EXISTS pharmacy;

-- ─── Dispense header — one row per OPD visit (IPD will add source_kind on dispense later) ─

CREATE TABLE IF NOT EXISTS pharmacy.dispense (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  iq_tenant_id uuid NOT NULL,
  visit_id uuid NOT NULL,
  patient_id uuid NOT NULL,
  opd_prescription_id uuid,
  department_id uuid,
  branch_id uuid,
  inventory_store_id uuid,
  priority text NOT NULL DEFAULT 'routine',
  subtotal numeric(18, 4) NOT NULL DEFAULT 0,
  discount numeric(18, 4) NOT NULL DEFAULT 0,
  total_amount numeric(18, 4) NOT NULL DEFAULT 0,
  notes text,
  dispense_status text NOT NULL DEFAULT 'issued',
  dispense_draft_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  CONSTRAINT dispense_pkey PRIMARY KEY (iq_tenant_id, id),
  CONSTRAINT dispense_subtotal_nonneg_chk CHECK (subtotal >= 0),
  CONSTRAINT dispense_discount_nonneg_chk CHECK (discount >= 0),
  CONSTRAINT dispense_total_nonneg_chk CHECK (total_amount >= 0),
  CONSTRAINT dispense_dispense_status_check
    CHECK (dispense_status IN ('issued', 'partial_issue')),
  CONSTRAINT dispense_priority_chk CHECK (priority IN ('stat', 'urgent', 'routine')),
  CONSTRAINT dispense_visit_patient_chk CHECK (visit_id IS NOT NULL AND patient_id IS NOT NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_pharmacy_dispense_tenant_visit
  ON pharmacy.dispense (iq_tenant_id, visit_id);

CREATE INDEX IF NOT EXISTS ix_pharmacy_dispense_tenant_patient
  ON pharmacy.dispense (iq_tenant_id, patient_id);

CREATE INDEX IF NOT EXISTS ix_pharmacy_dispense_tenant_prescription
  ON pharmacy.dispense (iq_tenant_id, opd_prescription_id)
  WHERE opd_prescription_id IS NOT NULL;

-- ─── Dispense lines (IQSandbox pharmacy_dispense_lines parity) ───────────────

CREATE TABLE IF NOT EXISTS pharmacy.dispense_line_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  iq_tenant_id uuid NOT NULL,
  dispense_id uuid NOT NULL,
  medicine_id uuid,
  medicine_display_name text NOT NULL,
  opd_prescription_item_id uuid,
  opd_prescription_line_no integer,
  prescribed_quantity numeric(12, 4),
  quantity_dispensed numeric(12, 4) NOT NULL DEFAULT 0,
  unit_amount numeric(18, 4) NOT NULL DEFAULT 0,
  line_discount numeric(18, 4) NOT NULL DEFAULT 0,
  tax_percent numeric(8, 4) NOT NULL DEFAULT 0,
  tax_amount numeric(18, 4) NOT NULL DEFAULT 0,
  line_total numeric(18, 4) NOT NULL DEFAULT 0,
  stock_batch_id uuid,
  is_substitution boolean NOT NULL DEFAULT false,
  substitute_of_line_id uuid,
  substitution_reason text,
  line_remarks text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT dispense_line_items_pkey PRIMARY KEY (iq_tenant_id, id),
  CONSTRAINT dispense_line_items_qty_nonneg_chk CHECK (quantity_dispensed >= 0),
  CONSTRAINT dispense_line_items_unit_amount_nonneg_chk CHECK (unit_amount >= 0),
  CONSTRAINT dispense_line_items_line_discount_nonneg_chk CHECK (line_discount >= 0),
  CONSTRAINT dispense_line_items_tax_percent_nonneg_chk CHECK (tax_percent >= 0),
  CONSTRAINT dispense_line_items_tax_amount_nonneg_chk CHECK (tax_amount >= 0),
  CONSTRAINT dispense_line_items_line_total_nonneg_chk CHECK (line_total >= 0),
  CONSTRAINT dispense_line_items_dispense_fk
    FOREIGN KEY (iq_tenant_id, dispense_id)
    REFERENCES pharmacy.dispense (iq_tenant_id, id)
    ON DELETE CASCADE,
  CONSTRAINT dispense_line_items_substitute_fk
    FOREIGN KEY (iq_tenant_id, substitute_of_line_id)
    REFERENCES pharmacy.dispense_line_items (iq_tenant_id, id)
    ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS ix_pharmacy_dispense_line_items_dispense
  ON pharmacy.dispense_line_items (iq_tenant_id, dispense_id);

CREATE INDEX IF NOT EXISTS ix_pharmacy_dispense_line_items_prescription_item
  ON pharmacy.dispense_line_items (iq_tenant_id, opd_prescription_item_id)
  WHERE opd_prescription_item_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_pharmacy_dispense_line_items_tenant_medicine
  ON pharmacy.dispense_line_items (iq_tenant_id, medicine_id)
  WHERE medicine_id IS NOT NULL;

-- ─── Unified pharmacy queue projection (OPD + future IPD) ───────────────────
-- Producers push denormalized rows; pharmacy lists without cross-schema joins.
-- Identity: (source_kind, source_ref_id) — Rx id for OPD, med order id for IPD.

CREATE TABLE IF NOT EXISTS pharmacy.queue_projection (
  queue_item_id uuid NOT NULL DEFAULT gen_random_uuid(),
  iq_tenant_id uuid NOT NULL,
  source_kind text NOT NULL DEFAULT 'opd',
  source_ref_id uuid NOT NULL,
  encounter_id uuid NOT NULL,
  patient_id uuid NOT NULL,
  prescription_id uuid NOT NULL,
  doctor_id uuid,
  visit_status text NOT NULL,
  prescription_status text NOT NULL,
  medicine_count integer NOT NULL DEFAULT 0,
  priority text NOT NULL DEFAULT 'routine',
  queued_at timestamptz NOT NULL,
  patient_name text,
  uhid text,
  phone text,
  age_years integer,
  gender text,
  doctor_name text,
  formatted_visit_id text,
  dispense_status text NOT NULL DEFAULT 'pending',
  context_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_synced_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT queue_projection_pkey PRIMARY KEY (iq_tenant_id, queue_item_id),
  CONSTRAINT queue_projection_source_kind_chk CHECK (source_kind IN ('opd', 'ipd')),
  CONSTRAINT queue_projection_priority_chk CHECK (priority IN ('stat', 'urgent', 'routine')),
  CONSTRAINT queue_projection_dispense_status_check
    CHECK (dispense_status IN ('pending', 'issued', 'partial_issue')),
  CONSTRAINT queue_projection_medicine_count_nonneg_chk CHECK (medicine_count >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_pharmacy_queue_projection_source
  ON pharmacy.queue_projection (iq_tenant_id, source_kind, source_ref_id);

CREATE INDEX IF NOT EXISTS ix_pharmacy_queue_projection_encounter
  ON pharmacy.queue_projection (iq_tenant_id, source_kind, encounter_id);

CREATE INDEX IF NOT EXISTS ix_pharmacy_queue_projection_tenant_kind_status_queued
  ON pharmacy.queue_projection (iq_tenant_id, source_kind, dispense_status, queued_at DESC);

CREATE INDEX IF NOT EXISTS ix_pharmacy_queue_projection_tenant_kind_queued
  ON pharmacy.queue_projection (iq_tenant_id, source_kind, queued_at DESC);

DO $$
BEGIN
  IF current_setting('citus.coordinator_node_count', true) IS NOT NULL THEN
    PERFORM create_distributed_table('pharmacy.dispense', 'iq_tenant_id');
    PERFORM create_distributed_table('pharmacy.dispense_line_items', 'iq_tenant_id');
    PERFORM create_distributed_table('pharmacy.queue_projection', 'iq_tenant_id');
  END IF;
END $$;
