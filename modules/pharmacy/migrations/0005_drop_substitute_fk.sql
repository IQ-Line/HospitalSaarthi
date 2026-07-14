-- Citus rejects ON DELETE SET NULL on FKs that include the distribution column.
-- Drop the self-referential substitute FK if an earlier migration created it.
ALTER TABLE pharmacy.dispense_line_items
  DROP CONSTRAINT IF EXISTS dispense_line_items_substitute_fk;
