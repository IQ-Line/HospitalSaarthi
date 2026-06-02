-- Desk statuses: pending, in_progress, completed, cancelled.
-- Legacy `routed` → in_progress only; preserve operator-cancelled rows.
-- Skipped when registration_status was removed by 0004 (visit split).

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'registration'
      AND table_name = 'registration'
      AND column_name = 'registration_status'
  ) THEN
    UPDATE registration.registration
    SET registration_status = 'in_progress'
    WHERE registration_status = 'routed';

    UPDATE registration.registration
    SET registration_status = 'pending'
    WHERE registration_status NOT IN ('pending', 'in_progress', 'completed', 'cancelled');

    ALTER TABLE registration.registration DROP CONSTRAINT IF EXISTS registration_status_chk;

    ALTER TABLE registration.registration
      ADD CONSTRAINT registration_status_chk CHECK (
        registration_status IN ('pending', 'in_progress', 'completed', 'cancelled')
      );
  END IF;
END $$;
