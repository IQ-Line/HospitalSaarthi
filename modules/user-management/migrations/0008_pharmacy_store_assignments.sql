-- Pharmacy store access assignments for users (tenant-scoped).
-- No create_distributed_table here: user_management schema tables are coordinator-local
-- in dev (see 0000). Citus rejects FK → users when distributing this table.

-- Drop legacy polymorphic draft or failed partial apply.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'user_management'
      AND table_name = 'pharmacy_store_assignments'
      AND column_name = 'owner_kind'
  ) THEN
    DROP TABLE user_management.pharmacy_store_assignments;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS user_management.pharmacy_store_assignments (
  iq_tenant_id uuid NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  store_id uuid NOT NULL,
  assignment_kind text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pharmacy_store_assignments_pkey PRIMARY KEY (iq_tenant_id, id),
  CONSTRAINT pharmacy_store_assignments_user_fk
    FOREIGN KEY (iq_tenant_id, user_id)
    REFERENCES user_management.users (iq_tenant_id, id)
    ON DELETE CASCADE,
  CONSTRAINT pharmacy_store_assignments_assignment_kind_chk
    CHECK (assignment_kind IN ('primary', 'secondary')),
  CONSTRAINT pharmacy_store_assignments_user_store_unique
    UNIQUE (iq_tenant_id, user_id, store_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_pharmacy_store_assignments_primary_user
  ON user_management.pharmacy_store_assignments (iq_tenant_id, user_id)
  WHERE assignment_kind = 'primary';

CREATE INDEX IF NOT EXISTS ix_pharmacy_store_assignments_user
  ON user_management.pharmacy_store_assignments (iq_tenant_id, user_id);
