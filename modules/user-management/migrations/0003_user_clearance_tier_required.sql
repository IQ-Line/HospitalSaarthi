-- ABAC: minimum principal clearance tier required to read/update/delete a user record (0 = none).

ALTER TABLE user_management.users
  ADD COLUMN IF NOT EXISTS clearance_tier_required integer NOT NULL DEFAULT 0;

ALTER TABLE user_management.users
  DROP CONSTRAINT IF EXISTS users_clearance_tier_chk;

ALTER TABLE user_management.users
  ADD CONSTRAINT users_clearance_tier_chk
  CHECK (clearance_tier_required >= 0 AND clearance_tier_required <= 3);
