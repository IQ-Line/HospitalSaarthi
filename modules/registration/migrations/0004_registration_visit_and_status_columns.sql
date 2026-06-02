-- Repair dev DBs where registration.registration was created without visit/status columns
-- (CREATE TABLE IF NOT EXISTS in 0000 skips when an older partial table already exists).

ALTER TABLE registration.registration
  ADD COLUMN IF NOT EXISTS visit_id uuid,
  ADD COLUMN IF NOT EXISTS facility_id uuid,
  ADD COLUMN IF NOT EXISTS visit_type text,
  ADD COLUMN IF NOT EXISTS department_id uuid,
  ADD COLUMN IF NOT EXISTS provider_id uuid,
  ADD COLUMN IF NOT EXISTS appointment_id uuid,
  ADD COLUMN IF NOT EXISTS registration_status varchar(32);

UPDATE registration.registration
SET registration_status = 'pending'
WHERE registration_status IS NULL;

ALTER TABLE registration.registration
  ALTER COLUMN registration_status SET DEFAULT 'pending';

ALTER TABLE registration.registration
  ALTER COLUMN registration_status SET NOT NULL;

ALTER TABLE registration.registration DROP CONSTRAINT IF EXISTS registration_status_chk;

ALTER TABLE registration.registration
  ADD CONSTRAINT registration_status_chk CHECK (
    registration_status IN ('pending', 'in_progress', 'completed', 'cancelled')
  );

CREATE INDEX IF NOT EXISTS idx_registration_visit
  ON registration.registration (iq_tenant_id, visit_id);

CREATE INDEX IF NOT EXISTS idx_registration_status
  ON registration.registration (iq_tenant_id, registration_status);
