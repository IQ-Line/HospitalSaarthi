-- Idempotent upgrade from the initial registration schema (dev DBs created before hardening).
-- Safe to re-run; pairs with 0000 for fresh installs.

ALTER TABLE registration.registration
  ADD COLUMN IF NOT EXISTS idempotency_key text;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'registration'
      AND table_name = 'registration'
      AND column_name = 'registration_status'
  ) THEN
    ALTER TABLE registration.registration
      ALTER COLUMN registration_status TYPE varchar(32);

    ALTER TABLE registration.registration
      ALTER COLUMN registration_status SET DEFAULT 'pending';

    UPDATE registration.registration
    SET registration_status = lower(btrim(registration_status))
    WHERE registration_status IS NOT NULL
      AND registration_status <> lower(btrim(registration_status));

    UPDATE registration.registration
    SET registration_status = 'pending'
    WHERE registration_status IS NULL
       OR registration_status NOT IN ('pending');

    ALTER TABLE registration.registration DROP CONSTRAINT IF EXISTS registration_status_chk;

    ALTER TABLE registration.registration
      ADD CONSTRAINT registration_status_chk CHECK (registration_status IN ('pending'));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_registration_idempotency
  ON registration.registration (iq_tenant_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

DO $$
BEGIN
  IF current_setting('citus.coordinator_node_count', true) IS NOT NULL THEN
    PERFORM create_distributed_table('registration.registration', 'iq_tenant_id');
  END IF;
END $$;
