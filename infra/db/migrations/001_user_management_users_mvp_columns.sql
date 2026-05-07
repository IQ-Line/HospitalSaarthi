-- user_management.users — MVP columns (auth linkage, lifecycle, username, org)
-- Apply against an existing `user_management.users` table (e.g. after Drizzle push or prior DDL).
-- Citus: run on coordinator; adding columns to a distributed table is supported.

ALTER TABLE user_management.users
  ADD COLUMN IF NOT EXISTS auth_user_id uuid,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS username text,
  ADD COLUMN IF NOT EXISTS org_id uuid;

DO $$
BEGIN
  ALTER TABLE user_management.users
    ADD CONSTRAINT users_status_chk CHECK (status IN ('active', 'inactive', 'suspended'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_users_tenant_username
  ON user_management.users (iq_tenant_id, username);
