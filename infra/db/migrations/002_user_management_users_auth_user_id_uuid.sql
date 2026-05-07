-- Upgrade path: if `001` was applied when auth_user_id was text, widen to uuid.
-- Safe to run once; no-op when column is already uuid or absent (skipped).

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'user_management'
      AND table_name = 'users'
      AND column_name = 'auth_user_id'
      AND data_type = 'text'
  ) THEN
    ALTER TABLE user_management.users
      ALTER COLUMN auth_user_id TYPE uuid USING auth_user_id::uuid;
  END IF;
END $$;
