-- Canonical capability catalog seed for the User Management module.

INSERT INTO user_management.capabilities (
  capability_key,
  module,
  feature,
  action,
  display_name,
  description
) VALUES
  ('um:user:create', 'user-management', 'users', 'create', 'Create users', 'Create tenant-scoped platform users.'),
  ('um:user:read', 'user-management', 'users', 'read', 'Read users', 'Read individual user records.'),
  ('um:user:update', 'user-management', 'users', 'update', 'Update users', 'Update tenant-scoped user profiles.'),
  ('um:user:deactivate', 'user-management', 'users', 'deactivate', 'Deactivate users', 'Deactivate tenant-scoped user profiles.'),
  ('um:role:read', 'user-management', 'roles', 'read', 'Read roles', 'Read tenant-scoped role definitions.'),
  ('um:role:create', 'user-management', 'roles', 'create', 'Create roles', 'Create tenant-scoped roles.'),
  ('um:role:update', 'user-management', 'roles', 'update', 'Update roles', 'Update tenant-scoped role definitions.'),
  ('um:role:assign', 'user-management', 'roles', 'assign', 'Assign roles', 'Assign or revoke roles for a user.'),
  ('um:capability:read', 'user-management', 'capabilities', 'read', 'Read capabilities', 'Read the canonical capability catalog.')
ON CONFLICT (capability_key) DO NOTHING;
