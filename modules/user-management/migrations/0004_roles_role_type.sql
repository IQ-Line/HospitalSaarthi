-- Optional role classification (matches master-data system_roles.role_type picklist values).

ALTER TABLE user_management.roles
  ADD COLUMN IF NOT EXISTS role_type text;
