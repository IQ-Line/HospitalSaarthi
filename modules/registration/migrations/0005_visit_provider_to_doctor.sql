-- Rename visit.provider_id → visit.doctor_id (idempotent for DBs that ran 0004 before rename).
-- Safe to re-run.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'registration'
      AND table_name = 'visit'
      AND column_name = 'provider_id'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'registration'
      AND table_name = 'visit'
      AND column_name = 'doctor_id'
  ) THEN
    ALTER TABLE registration.visit RENAME COLUMN provider_id TO doctor_id;
  END IF;
END $$;
