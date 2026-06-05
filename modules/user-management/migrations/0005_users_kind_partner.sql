-- Partner / service principal kinds (ADR-0032 amendment B).

ALTER TABLE user_management.users
  ADD COLUMN IF NOT EXISTS kind text;

UPDATE user_management.users
SET kind = 'human'
WHERE kind IS NULL;

ALTER TABLE user_management.users
  ALTER COLUMN kind SET NOT NULL,
  ALTER COLUMN kind SET DEFAULT 'human';

ALTER TABLE user_management.users
  ADD COLUMN IF NOT EXISTS integration_id uuid;

ALTER TABLE user_management.users
  DROP CONSTRAINT IF EXISTS users_kind_chk;

ALTER TABLE user_management.users
  ADD CONSTRAINT users_kind_chk CHECK (kind in ('human', 'partner', 'service'));

ALTER TABLE user_management.users
  DROP CONSTRAINT IF EXISTS users_partner_non_loginable_chk;

ALTER TABLE user_management.users
  ADD CONSTRAINT users_partner_non_loginable_chk CHECK (
    kind != 'partner' OR (
      integration_id IS NOT NULL AND
      auth_user_id IS NULL AND
      email IS NULL AND
      username IS NULL AND
      phone IS NULL
    )
  );

ALTER TABLE user_management.users
  DROP CONSTRAINT IF EXISTS users_partner_integration_required_chk;

ALTER TABLE user_management.users
  ADD CONSTRAINT users_partner_integration_required_chk CHECK (
    kind != 'partner' OR integration_id IS NOT NULL
  );

ALTER TABLE user_management.users
  DROP CONSTRAINT IF EXISTS users_human_no_integration_chk;

ALTER TABLE user_management.users
  ADD CONSTRAINT users_human_no_integration_chk CHECK (
    kind = 'human' OR integration_id IS NULL
  );

DROP INDEX IF EXISTS uq_users_tenant_integration_partner;

CREATE UNIQUE INDEX IF NOT EXISTS uq_users_tenant_integration_partner
  ON user_management.users (iq_tenant_id, integration_id)
  WHERE kind = 'partner' AND integration_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_tenant_kind
  ON user_management.users (iq_tenant_id, kind);
