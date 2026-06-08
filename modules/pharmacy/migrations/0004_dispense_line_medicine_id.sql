-- Link dispense lines to tenant master medicines catalog (visitpad medicines).
ALTER TABLE pharmacy.dispense_line_items
  ADD COLUMN IF NOT EXISTS medicine_id uuid;

CREATE INDEX IF NOT EXISTS ix_pharmacy_dispense_line_items_tenant_medicine
  ON pharmacy.dispense_line_items (iq_tenant_id, medicine_id)
  WHERE medicine_id IS NOT NULL;
