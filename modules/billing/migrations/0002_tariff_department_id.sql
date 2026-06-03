-- Single department_id (uuid): rename legacy varchar `department`; drop duplicate if a prior 0002 ran.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'billing' AND table_name = 'tariff_master' AND column_name = 'department'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'billing' AND table_name = 'tariff_master'
      AND column_name = 'department_id' AND udt_name = 'uuid'
  ) THEN
    UPDATE billing.tariff_master
    SET department_id = COALESCE(
      department_id,
      CASE
        WHEN trim(department) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        THEN trim(department)::uuid
        ELSE NULL
      END
    );
    ALTER TABLE billing.tariff_master DROP COLUMN department;
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'billing' AND table_name = 'tariff_master' AND column_name = 'department'
  ) THEN
    ALTER TABLE billing.tariff_master RENAME COLUMN department TO department_id;
  END IF;
END $$;

ALTER TABLE billing.tariff_master
  ALTER COLUMN department_id TYPE uuid
  USING (
    CASE
      WHEN department_id IS NULL THEN NULL
      WHEN trim(department_id::text) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      THEN trim(department_id::text)::uuid
      ELSE NULL
    END
  );

CREATE UNIQUE INDEX IF NOT EXISTS uq_tariff_master_provider_department
  ON billing.tariff_master (iq_tenant_id, provider_id, department_id)
  WHERE provider_id IS NOT NULL AND department_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tariff_master_tenant_department_id
  ON billing.tariff_master (iq_tenant_id, department_id)
  WHERE department_id IS NOT NULL;

-- Tariff catalog list: newest created first (ORDER BY created_at DESC, id DESC).
CREATE INDEX IF NOT EXISTS idx_tariff_master_tenant_created_at_desc
  ON billing.tariff_master (iq_tenant_id, created_at DESC, id DESC);
