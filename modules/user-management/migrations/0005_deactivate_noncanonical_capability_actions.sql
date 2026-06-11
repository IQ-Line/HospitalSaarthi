-- Deactivate catalog rows whose action segment is outside the runtime vocabulary.
-- Orphan Integration Hub partner keys (activate, disable, issue, revoke, reactivate, …)
-- were synced before MD dropped them; they block UM startup validation.

UPDATE user_management.capabilities
SET
  is_active = false,
  updated_at = now()
WHERE is_active = true
  AND lower(trim(action)) NOT IN (
    'access',
    'assign',
    'compose',
    'create',
    'deactivate',
    'delete',
    'manage',
    'read',
    'update',
    'view'
  );
