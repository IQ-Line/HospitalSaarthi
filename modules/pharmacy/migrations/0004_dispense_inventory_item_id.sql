-- Link dispense lines to inventory item master for stock deduction / FEFO.
ALTER TABLE pharmacy.dispense_line_items
  ADD COLUMN IF NOT EXISTS inventory_item_id uuid;
