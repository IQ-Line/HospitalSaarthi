-- better-auth username plugin columns + platform recovery tier (Phase 1 MVP).

ALTER TABLE auth."user"
  ADD COLUMN IF NOT EXISTS "username" text,
  ADD COLUMN IF NOT EXISTS "displayUsername" text;

CREATE UNIQUE INDEX IF NOT EXISTS "uq_auth_user_username"
  ON auth."user" ("username")
  WHERE "username" IS NOT NULL;

-- Backfill auth usernames from linked platform users.
UPDATE auth."user" au
SET
  "username" = u.username,
  "displayUsername" = u.username
FROM user_management.users u
WHERE u.auth_user_id::text = au.id
  AND u.username IS NOT NULL
  AND au."username" IS NULL;

ALTER TABLE user_management.users
  ADD COLUMN IF NOT EXISTS recovery_tier text NOT NULL DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS must_change_password boolean NOT NULL DEFAULT false;

ALTER TABLE user_management.users
  DROP CONSTRAINT IF EXISTS users_recovery_tier_chk;

ALTER TABLE user_management.users
  ADD CONSTRAINT users_recovery_tier_chk
  CHECK (recovery_tier IN ('standard', 'admin_only', 'delegated', 'phone_recovery', 'federated'));

UPDATE user_management.users
SET recovery_tier = CASE
  WHEN email IS NOT NULL AND btrim(email) <> '' THEN 'standard'
  ELSE 'admin_only'
END
WHERE recovery_tier = 'standard';
