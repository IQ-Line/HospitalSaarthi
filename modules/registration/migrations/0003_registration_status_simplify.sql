-- Desk statuses: pending, in_progress, completed, cancelled.
-- Legacy `routed` → in_progress only; preserve operator-cancelled rows.

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
