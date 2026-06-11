ALTER TABLE user_management.users
  ADD COLUMN IF NOT EXISTS api_key_prefix text,
  ADD COLUMN IF NOT EXISTS api_key_hash text;

CREATE INDEX IF NOT EXISTS idx_users_api_key_prefix
  ON user_management.users (api_key_prefix)
  WHERE api_key_prefix IS NOT NULL AND status = 'active';
