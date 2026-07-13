-- Pharmacy dispense returns — amounts stored in pharmacy schema (no billing refund v1).

ALTER TABLE pharmacy.dispense_line_items
  ADD COLUMN IF NOT EXISTS quantity_returned numeric(12, 4) NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS pharmacy.dispense_return (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  iq_tenant_id uuid NOT NULL,
  return_number text NOT NULL,
  dispense_id uuid NOT NULL,
  visit_id uuid NOT NULL,
  patient_id uuid NOT NULL,
  return_reason text NOT NULL,
  remarks text,
  verification_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  total_return_amount numeric(18, 4) NOT NULL DEFAULT 0,
  idempotency_key text,
  /** Pharmacist who processed the return — semantic alias of standard `created_by` (immutable header). */
  processed_by uuid,
  processed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  PRIMARY KEY (iq_tenant_id, id),
  CONSTRAINT dispense_return_dispense_fk
    FOREIGN KEY (iq_tenant_id, dispense_id)
    REFERENCES pharmacy.dispense (iq_tenant_id, id)
    ON DELETE RESTRICT
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_pharmacy_dispense_return_number
  ON pharmacy.dispense_return (iq_tenant_id, return_number);

CREATE UNIQUE INDEX IF NOT EXISTS ux_pharmacy_dispense_return_idempotency
  ON pharmacy.dispense_return (iq_tenant_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_pharmacy_dispense_return_dispense
  ON pharmacy.dispense_return (iq_tenant_id, dispense_id);

CREATE TABLE IF NOT EXISTS pharmacy.dispense_return_line_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  iq_tenant_id uuid NOT NULL,
  dispense_return_id uuid NOT NULL,
  dispense_line_item_id uuid NOT NULL,
  medicine_id uuid,
  medicine_display_name text NOT NULL,
  stock_batch_id uuid,
  return_qty numeric(12, 4) NOT NULL,
  unit_amount numeric(18, 4) NOT NULL DEFAULT 0,
  line_discount numeric(18, 4) NOT NULL DEFAULT 0,
  tax_amount numeric(18, 4) NOT NULL DEFAULT 0,
  return_amount numeric(18, 4) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  PRIMARY KEY (iq_tenant_id, id),
  CONSTRAINT dispense_return_line_return_fk
    FOREIGN KEY (iq_tenant_id, dispense_return_id)
    REFERENCES pharmacy.dispense_return (iq_tenant_id, id)
    ON DELETE CASCADE,
  CONSTRAINT dispense_return_line_dispense_line_fk
    FOREIGN KEY (iq_tenant_id, dispense_line_item_id)
    REFERENCES pharmacy.dispense_line_items (iq_tenant_id, id)
    ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS ix_pharmacy_dispense_return_lines_return
  ON pharmacy.dispense_return_line_items (iq_tenant_id, dispense_return_id);
