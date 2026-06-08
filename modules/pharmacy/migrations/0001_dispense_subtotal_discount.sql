-- Add subtotal and discount to existing dispense_records (idempotent).

ALTER TABLE pharmacy.dispense_records
  ADD COLUMN IF NOT EXISTS subtotal numeric(18, 4) NOT NULL DEFAULT 0;

ALTER TABLE pharmacy.dispense_records
  ADD COLUMN IF NOT EXISTS discount numeric(18, 4) NOT NULL DEFAULT 0;

-- Backfill subtotal from total where records predate this migration.
UPDATE pharmacy.dispense_records
SET subtotal = total_amount
WHERE subtotal = 0 AND total_amount > 0;
