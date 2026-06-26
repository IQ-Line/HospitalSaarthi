-- Add missing audit columns on inventory operational tables.
-- Idempotent: safe to run on every dev boot (CREATE TABLE IF NOT EXISTS in 0000 skips existing tables).

ALTER TABLE inventory.stores
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS updated_by uuid;

ALTER TABLE inventory.items
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS updated_by uuid;

ALTER TABLE inventory.grn_lines
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE inventory.lots
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE inventory.indent_lines
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE inventory.stock
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS updated_by uuid,
  ADD COLUMN IF NOT EXISTS created_at timestamptz;

UPDATE inventory.stock
SET created_at = updated_at
WHERE created_at IS NULL;

ALTER TABLE inventory.stock
  ALTER COLUMN created_at SET DEFAULT now();

ALTER TABLE inventory.stock
  ALTER COLUMN created_at SET NOT NULL;
