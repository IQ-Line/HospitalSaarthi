-- Add role_type: picklist value (repeatable per tenant). code remains tenant-unique short id.

ALTER TABLE user_management.roles
  ADD COLUMN IF NOT EXISTS role_type text;

UPDATE user_management.roles
SET role_type = code
WHERE role_type IS NULL;

ALTER TABLE user_management.roles
  ALTER COLUMN role_type SET NOT NULL;

ALTER TABLE user_management.roles
  DROP CONSTRAINT IF EXISTS roles_role_type_not_blank_chk;

ALTER TABLE user_management.roles
  ADD CONSTRAINT roles_role_type_not_blank_chk CHECK (length(btrim(role_type)) > 0);

ALTER TABLE user_management.roles
  DROP CONSTRAINT IF EXISTS roles_role_type_canonical_chk;

ALTER TABLE user_management.roles
  ADD CONSTRAINT roles_role_type_canonical_chk CHECK (role_type = lower(btrim(role_type)));

CREATE INDEX IF NOT EXISTS idx_roles_tenant_role_type
  ON user_management.roles (iq_tenant_id, role_type);
