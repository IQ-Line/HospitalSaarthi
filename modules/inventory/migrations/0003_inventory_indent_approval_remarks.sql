ALTER TABLE inventory.indents
  ADD COLUMN IF NOT EXISTS approval_remarks text;
