-- Patient demographics snapshot on registration row (ADR-0029 — EMPI-free reads).
-- Safe to re-run on dev DBs.
-- pg_trgm GIN index is optional (Azure may block CREATE EXTENSION until allow-listed).

ALTER TABLE registration.registration
  ADD COLUMN IF NOT EXISTS patient_uhid text,
  ADD COLUMN IF NOT EXISTS patient_abha_number text,
  ADD COLUMN IF NOT EXISTS patient_abha_address text,
  ADD COLUMN IF NOT EXISTS patient_full_name text,
  ADD COLUMN IF NOT EXISTS patient_phone_number text,
  ADD COLUMN IF NOT EXISTS patient_gender text,
  ADD COLUMN IF NOT EXISTS patient_date_of_birth date,
  ADD COLUMN IF NOT EXISTS patient_year_of_birth smallint,
  ADD COLUMN IF NOT EXISTS patient_source_record_id uuid;

-- Backfill nullable snapshot columns for rows created before this migration (best-effort).
DO $backfill$
DECLARE
  backfilled integer;
BEGIN
  WITH updated AS (
    UPDATE registration.registration
    SET
      patient_uhid = COALESCE(patient_uhid, 'UNKNOWN'),
      patient_full_name = COALESCE(patient_full_name, 'Unknown'),
      patient_phone_number = COALESCE(patient_phone_number, ''),
      patient_source_record_id = COALESCE(patient_source_record_id, patient_id)
    WHERE patient_uhid IS NULL
       OR patient_full_name IS NULL
       OR patient_phone_number IS NULL
       OR patient_source_record_id IS NULL
    RETURNING 1
  )
  SELECT count(*)::integer INTO backfilled FROM updated;

  IF backfilled > 0 THEN
    RAISE NOTICE 'registration 0002: backfilled patient snapshot on % row(s)', backfilled;
  END IF;
END $backfill$;

ALTER TABLE registration.registration
  ALTER COLUMN patient_uhid SET NOT NULL,
  ALTER COLUMN patient_full_name SET NOT NULL,
  ALTER COLUMN patient_phone_number SET NOT NULL,
  ALTER COLUMN patient_source_record_id SET NOT NULL;

ALTER TABLE registration.registration DROP CONSTRAINT IF EXISTS registration_status_chk;

ALTER TABLE registration.registration
  ADD CONSTRAINT registration_status_chk CHECK (
    registration_status IN (
      'pending',
      'routed',
      'in_progress',
      'completed',
      'cancelled'
    )
  );

CREATE INDEX IF NOT EXISTS idx_registration_uhid
  ON registration.registration (iq_tenant_id, patient_uhid);

CREATE INDEX IF NOT EXISTS idx_registration_phone
  ON registration.registration (iq_tenant_id, patient_phone_number);

-- Name search: prefer pg_trgm GIN when the extension is available (local Citus / docker).
-- Azure Database for PostgreSQL often blocks CREATE EXTENSION until allow-listed — use btree fallback.
DO $migrate$
BEGIN
  BEGIN
    CREATE EXTENSION IF NOT EXISTS pg_trgm;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'registration 0002: pg_trgm not installed (%), using btree name index', SQLERRM;
  END;

  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm') THEN
    DROP INDEX IF EXISTS registration.idx_registration_fullname_lower;
    EXECUTE $idx$
      CREATE INDEX IF NOT EXISTS idx_registration_fullname_trgm
        ON registration.registration USING gin (patient_full_name gin_trgm_ops)
    $idx$;
  ELSE
    DROP INDEX IF EXISTS registration.idx_registration_fullname_trgm;
    CREATE INDEX IF NOT EXISTS idx_registration_fullname_lower
      ON registration.registration (iq_tenant_id, lower(patient_full_name));
  END IF;
END $migrate$;
