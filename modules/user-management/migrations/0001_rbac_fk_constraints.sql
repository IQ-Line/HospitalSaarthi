-- RBAC FK integrity hardening (Phase 1)
-- Policy choice: RESTRICT on delete/update for users and roles referenced by role_assignments.
-- This migration fails fast when orphan role assignments already exist.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM user_management.role_assignments ra
    LEFT JOIN user_management.users u
      ON u.iq_tenant_id = ra.iq_tenant_id
     AND u.id = ra.user_id
    LEFT JOIN user_management.roles r
      ON r.iq_tenant_id = ra.iq_tenant_id
     AND r.id = ra.role_id
    WHERE u.id IS NULL OR r.id IS NULL
  ) THEN
    RAISE EXCEPTION 'RBAC integrity violation: orphan role assignment detected';
  END IF;
END $$;

ALTER TABLE user_management.role_assignments
  ADD CONSTRAINT fk_role_assignments_tenant_user
  FOREIGN KEY (iq_tenant_id, user_id)
  REFERENCES user_management.users(iq_tenant_id, id)
  ON DELETE RESTRICT
  ON UPDATE RESTRICT;

ALTER TABLE user_management.role_assignments
  ADD CONSTRAINT fk_role_assignments_tenant_role
  FOREIGN KEY (iq_tenant_id, role_id)
  REFERENCES user_management.roles(iq_tenant_id, id)
  ON DELETE RESTRICT
  ON UPDATE RESTRICT;
