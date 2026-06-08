ALTER TABLE pharmacy.dispense_records
  ADD COLUMN IF NOT EXISTS dispense_status text NOT NULL DEFAULT 'issued';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'dispense_records_dispense_status_check'
  ) THEN
    ALTER TABLE pharmacy.dispense_records
      ADD CONSTRAINT dispense_records_dispense_status_check
      CHECK (dispense_status IN ('issued', 'partial_issue'));
  END IF;
END $$;
