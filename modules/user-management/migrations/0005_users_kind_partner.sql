-- Partner principals (ADR-0032 amendment B): non-loginable integration identities.



ALTER TABLE user_management.users

  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'user',

  ADD COLUMN IF NOT EXISTS integration_id uuid,

  ADD COLUMN IF NOT EXISTS deactivated_at timestamptz,
  ADD COLUMN IF NOT EXISTS partner_deactivation_grant_ids uuid[];



ALTER TABLE user_management.users

  DROP CONSTRAINT IF EXISTS users_kind_chk;



ALTER TABLE user_management.users

  ADD CONSTRAINT users_kind_chk CHECK (kind IN ('user', 'partner'));



ALTER TABLE user_management.users

  DROP CONSTRAINT IF EXISTS users_partner_non_loginable_chk;



ALTER TABLE user_management.users

  ADD CONSTRAINT users_partner_non_loginable_chk CHECK (

    kind <> 'partner' OR (

      auth_user_id IS NULL

      AND email IS NULL

      AND username IS NULL

      AND phone IS NULL

    )

  );



ALTER TABLE user_management.users

  DROP CONSTRAINT IF EXISTS users_partner_integration_chk;



ALTER TABLE user_management.users

  ADD CONSTRAINT users_partner_integration_chk CHECK (

    kind <> 'partner' OR integration_id IS NOT NULL

  );



CREATE UNIQUE INDEX IF NOT EXISTS uq_users_tenant_partner_integration

  ON user_management.users (iq_tenant_id, integration_id)

  WHERE kind = 'partner' AND integration_id IS NOT NULL;



CREATE INDEX IF NOT EXISTS idx_users_tenant_kind

  ON user_management.users (iq_tenant_id, kind);

