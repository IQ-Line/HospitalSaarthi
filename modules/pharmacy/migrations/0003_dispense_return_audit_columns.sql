-- Converge dispense_return tables on standard audit columns (idempotent upgrade path).

ALTER TABLE pharmacy.dispense_return
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS updated_by uuid;

ALTER TABLE pharmacy.dispense_return_line_items
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS updated_by uuid;

-- Backfill created_by from processed_by where missing.
UPDATE pharmacy.dispense_return
SET
  created_by = processed_by,
  updated_by = processed_by
WHERE created_by IS NULL AND processed_by IS NOT NULL;
