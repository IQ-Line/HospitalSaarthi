-- Reform legacy registration.visit (uuid visit_id PK) → id (uuid PK) + visit_id (text).
-- No-op when visit_id is already text (fresh 0004 or prior successful run).
-- Same logic runs in 0004_visit_split.sql before the registration backfill INSERT.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'registration'
      AND table_name = 'visit'
      AND column_name = 'visit_id'
      AND udt_name = 'uuid'
  ) THEN
    RETURN;
  END IF;

  ALTER TABLE registration.visit ADD COLUMN IF NOT EXISTS id uuid;

  UPDATE registration.visit SET id = visit_id WHERE id IS NULL;

  ALTER TABLE registration.visit ALTER COLUMN id SET NOT NULL;

  ALTER TABLE registration.visit ADD COLUMN IF NOT EXISTS visit_number text;

  UPDATE registration.visit
  SET visit_number = 'LEG-' || upper(replace(substr(id::text, 1, 13), '-', ''))
  WHERE visit_number IS NULL;

  ALTER TABLE registration.visit DROP CONSTRAINT IF EXISTS visit_pkey;

  ALTER TABLE registration.visit DROP COLUMN visit_id;

  ALTER TABLE registration.visit RENAME COLUMN visit_number TO visit_id;

  ALTER TABLE registration.visit ALTER COLUMN visit_id SET NOT NULL;

  ALTER TABLE registration.visit ADD CONSTRAINT visit_pkey PRIMARY KEY (iq_tenant_id, id);
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_visit_tenant_visit_id
  ON registration.visit (iq_tenant_id, visit_id);
