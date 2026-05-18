-- Three desk statuses only: pending, in_progress, completed.

UPDATE registration.registration
SET registration_status = 'in_progress'
WHERE registration_status IN ('routed', 'cancelled');

UPDATE registration.registration
SET registration_status = 'pending'
WHERE registration_status NOT IN ('pending', 'in_progress', 'completed');

ALTER TABLE registration.registration DROP CONSTRAINT IF EXISTS registration_status_chk;

ALTER TABLE registration.registration
  ADD CONSTRAINT registration_status_chk CHECK (
    registration_status IN ('pending', 'in_progress', 'completed')
  );
