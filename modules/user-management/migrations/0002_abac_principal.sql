-- ABAC principal support: profile department, role capabilities, clearances, delegated capabilities.

ALTER TABLE user_management.users
  ADD COLUMN IF NOT EXISTS department text;

CREATE TABLE IF NOT EXISTS user_management.role_capabilities (
  iq_tenant_id uuid NOT NULL,
  role_id uuid NOT NULL,
  capability text NOT NULL,
  CONSTRAINT pk_role_capabilities PRIMARY KEY (iq_tenant_id, role_id, capability),
  CONSTRAINT fk_role_capabilities_tenant_role
    FOREIGN KEY (iq_tenant_id, role_id)
    REFERENCES user_management.roles (iq_tenant_id, id)
    ON DELETE CASCADE
    ON UPDATE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_role_capabilities_tenant_role
  ON user_management.role_capabilities (iq_tenant_id, role_id);

CREATE TABLE IF NOT EXISTS user_management.user_clearances (
  iq_tenant_id uuid NOT NULL,
  user_id uuid NOT NULL,
  clearance_key text NOT NULL,
  access_level text NOT NULL,
  CONSTRAINT pk_user_clearances PRIMARY KEY (iq_tenant_id, user_id, clearance_key),
  CONSTRAINT fk_user_clearances_tenant_user
    FOREIGN KEY (iq_tenant_id, user_id)
    REFERENCES user_management.users (iq_tenant_id, id)
    ON DELETE CASCADE
    ON UPDATE RESTRICT
);

CREATE TABLE IF NOT EXISTS user_management.delegated_capability_grants (
  iq_tenant_id uuid NOT NULL,
  delegatee_user_id uuid NOT NULL,
  capability text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  CONSTRAINT pk_delegated_capability_grants PRIMARY KEY (iq_tenant_id, delegatee_user_id, capability),
  CONSTRAINT fk_delegated_caps_tenant_user
    FOREIGN KEY (iq_tenant_id, delegatee_user_id)
    REFERENCES user_management.users (iq_tenant_id, id)
    ON DELETE CASCADE
    ON UPDATE RESTRICT
);
