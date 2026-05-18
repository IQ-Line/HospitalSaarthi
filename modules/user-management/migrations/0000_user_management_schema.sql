-- User Management authorization baseline.
-- Development-stage reset: capability-first schema with no backward compatibility.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE SCHEMA IF NOT EXISTS user_management;

CREATE TABLE IF NOT EXISTS user_management.users (
  iq_tenant_id uuid NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text,
  phone text,
  auth_user_id uuid,
  status text NOT NULL DEFAULT 'active',
  username text,
  org_id uuid,
  department text,
  clearance_tier_required integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  CONSTRAINT pk_users PRIMARY KEY (iq_tenant_id, id),
  CONSTRAINT users_status_chk CHECK (status IN ('active', 'inactive', 'suspended')),
  CONSTRAINT users_clearance_tier_chk CHECK (
    clearance_tier_required >= 0 AND clearance_tier_required <= 3
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_users_tenant_username
  ON user_management.users (iq_tenant_id, username);

CREATE TABLE IF NOT EXISTS user_management.capabilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  capability_key text NOT NULL,
  module text NOT NULL,
  feature text NOT NULL,
  action text NOT NULL,
  display_name text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT capabilities_key_not_blank_chk CHECK (length(btrim(capability_key)) > 0),
  CONSTRAINT capabilities_key_canonical_chk CHECK (capability_key = lower(btrim(capability_key))),
  CONSTRAINT capabilities_module_not_blank_chk CHECK (length(btrim(module)) > 0),
  CONSTRAINT capabilities_feature_not_blank_chk CHECK (length(btrim(feature)) > 0),
  CONSTRAINT capabilities_action_not_blank_chk CHECK (length(btrim(action)) > 0),
  CONSTRAINT capabilities_display_name_not_blank_chk CHECK (length(btrim(display_name)) > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_capabilities_key
  ON user_management.capabilities (capability_key);

CREATE UNIQUE INDEX IF NOT EXISTS uq_capabilities_module_feature_action
  ON user_management.capabilities (module, feature, action);

CREATE INDEX IF NOT EXISTS idx_capabilities_module_feature
  ON user_management.capabilities (module, feature);

CREATE TABLE IF NOT EXISTS user_management.roles (
  iq_tenant_id uuid NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  code text NOT NULL,
  display_name text NOT NULL,
  description text,
  is_system boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pk_roles PRIMARY KEY (iq_tenant_id, id),
  CONSTRAINT roles_code_not_blank_chk CHECK (length(btrim(code)) > 0),
  CONSTRAINT roles_code_canonical_chk CHECK (code = lower(btrim(code))),
  CONSTRAINT roles_display_name_not_blank_chk CHECK (length(btrim(display_name)) > 0),
  CONSTRAINT roles_status_chk CHECK (status IN ('active', 'inactive'))
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_roles_tenant_code
  ON user_management.roles (iq_tenant_id, code);

CREATE INDEX IF NOT EXISTS idx_roles_tenant_status
  ON user_management.roles (iq_tenant_id, status);

CREATE TABLE IF NOT EXISTS user_management.role_capabilities (
  iq_tenant_id uuid NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  role_id uuid NOT NULL,
  capability_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pk_role_capabilities PRIMARY KEY (iq_tenant_id, id),
  CONSTRAINT fk_role_capabilities_tenant_role
    FOREIGN KEY (iq_tenant_id, role_id)
    REFERENCES user_management.roles (iq_tenant_id, id)
    ON DELETE CASCADE
    ON UPDATE RESTRICT,
  CONSTRAINT fk_role_capabilities_capability
    FOREIGN KEY (capability_id)
    REFERENCES user_management.capabilities (id)
    ON DELETE RESTRICT
    ON UPDATE RESTRICT
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_role_capabilities_tenant_role_capability
  ON user_management.role_capabilities (iq_tenant_id, role_id, capability_id);

CREATE INDEX IF NOT EXISTS idx_role_capabilities_tenant_role
  ON user_management.role_capabilities (iq_tenant_id, role_id);

CREATE INDEX IF NOT EXISTS idx_role_capabilities_capability
  ON user_management.role_capabilities (capability_id);

CREATE TABLE IF NOT EXISTS user_management.user_roles (
  iq_tenant_id uuid NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role_id uuid NOT NULL,
  assigned_by_user_id uuid,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pk_user_roles PRIMARY KEY (iq_tenant_id, id),
  CONSTRAINT fk_user_roles_tenant_user
    FOREIGN KEY (iq_tenant_id, user_id)
    REFERENCES user_management.users (iq_tenant_id, id)
    ON DELETE RESTRICT
    ON UPDATE RESTRICT,
  CONSTRAINT fk_user_roles_tenant_role
    FOREIGN KEY (iq_tenant_id, role_id)
    REFERENCES user_management.roles (iq_tenant_id, id)
    ON DELETE RESTRICT
    ON UPDATE RESTRICT,
  CONSTRAINT fk_user_roles_tenant_assigned_by_user
    FOREIGN KEY (iq_tenant_id, assigned_by_user_id)
    REFERENCES user_management.users (iq_tenant_id, id)
    ON DELETE RESTRICT
    ON UPDATE RESTRICT
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_user_roles_tenant_user_role
  ON user_management.user_roles (iq_tenant_id, user_id, role_id);

CREATE INDEX IF NOT EXISTS idx_user_roles_tenant_user
  ON user_management.user_roles (iq_tenant_id, user_id);

CREATE INDEX IF NOT EXISTS idx_user_roles_tenant_role
  ON user_management.user_roles (iq_tenant_id, role_id);

CREATE TABLE IF NOT EXISTS user_management.user_capabilities (
  iq_tenant_id uuid NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  capability_id uuid NOT NULL,
  grant_source text NOT NULL,
  source_role_id uuid,
  granted_by_user_id uuid,
  granted_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  revoked_by_user_id uuid,
  CONSTRAINT pk_user_capabilities PRIMARY KEY (iq_tenant_id, id),
  CONSTRAINT fk_user_capabilities_tenant_user
    FOREIGN KEY (iq_tenant_id, user_id)
    REFERENCES user_management.users (iq_tenant_id, id)
    ON DELETE RESTRICT
    ON UPDATE RESTRICT,
  CONSTRAINT fk_user_capabilities_capability
    FOREIGN KEY (capability_id)
    REFERENCES user_management.capabilities (id)
    ON DELETE RESTRICT
    ON UPDATE RESTRICT,
  CONSTRAINT fk_user_capabilities_tenant_source_role
    FOREIGN KEY (iq_tenant_id, source_role_id)
    REFERENCES user_management.roles (iq_tenant_id, id)
    ON DELETE RESTRICT
    ON UPDATE RESTRICT,
  CONSTRAINT fk_user_capabilities_tenant_granted_by_user
    FOREIGN KEY (iq_tenant_id, granted_by_user_id)
    REFERENCES user_management.users (iq_tenant_id, id)
    ON DELETE RESTRICT
    ON UPDATE RESTRICT,
  CONSTRAINT fk_user_capabilities_tenant_revoked_by_user
    FOREIGN KEY (iq_tenant_id, revoked_by_user_id)
    REFERENCES user_management.users (iq_tenant_id, id)
    ON DELETE RESTRICT
    ON UPDATE RESTRICT,
  CONSTRAINT user_capabilities_grant_source_chk CHECK (
    grant_source IN ('manual', 'role_template', 'delegated', 'system')
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_user_capabilities_tenant_user_capability
  ON user_management.user_capabilities (iq_tenant_id, user_id, capability_id);

CREATE INDEX IF NOT EXISTS idx_user_capabilities_tenant_user
  ON user_management.user_capabilities (iq_tenant_id, user_id);

CREATE INDEX IF NOT EXISTS idx_user_capabilities_tenant_user_revoked
  ON user_management.user_capabilities (iq_tenant_id, user_id, revoked_at);

CREATE INDEX IF NOT EXISTS idx_user_capabilities_tenant_capability
  ON user_management.user_capabilities (iq_tenant_id, capability_id);

CREATE TABLE IF NOT EXISTS user_management.delegated_capability_grants (
  iq_tenant_id uuid NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  source_user_id uuid NOT NULL,
  target_user_id uuid NOT NULL,
  capability_id uuid NOT NULL,
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pk_delegated_capability_grants PRIMARY KEY (iq_tenant_id, id),
  CONSTRAINT fk_delegated_grants_tenant_source_user
    FOREIGN KEY (iq_tenant_id, source_user_id)
    REFERENCES user_management.users (iq_tenant_id, id)
    ON DELETE RESTRICT
    ON UPDATE RESTRICT,
  CONSTRAINT fk_delegated_grants_tenant_target_user
    FOREIGN KEY (iq_tenant_id, target_user_id)
    REFERENCES user_management.users (iq_tenant_id, id)
    ON DELETE RESTRICT
    ON UPDATE RESTRICT,
  CONSTRAINT fk_delegated_grants_capability
    FOREIGN KEY (capability_id)
    REFERENCES user_management.capabilities (id)
    ON DELETE RESTRICT
    ON UPDATE RESTRICT,
  CONSTRAINT delegated_capability_grants_status_chk CHECK (
    status IN ('pending', 'active', 'revoked', 'expired')
  ),
  CONSTRAINT delegated_capability_grants_window_chk CHECK (
    ends_at IS NULL OR ends_at > starts_at
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_delegated_grants_tenant_source_target_capability_start
  ON user_management.delegated_capability_grants (
    iq_tenant_id,
    source_user_id,
    target_user_id,
    capability_id,
    starts_at
  );

CREATE INDEX IF NOT EXISTS idx_delegated_grants_tenant_target_status
  ON user_management.delegated_capability_grants (iq_tenant_id, target_user_id, status);

CREATE TABLE IF NOT EXISTS user_management.user_clearances (
  iq_tenant_id uuid NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  clearance_key text NOT NULL,
  clearance_level text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pk_user_clearances PRIMARY KEY (iq_tenant_id, id),
  CONSTRAINT fk_user_clearances_tenant_user
    FOREIGN KEY (iq_tenant_id, user_id)
    REFERENCES user_management.users (iq_tenant_id, id)
    ON DELETE CASCADE
    ON UPDATE RESTRICT,
  CONSTRAINT user_clearances_key_not_blank_chk CHECK (length(btrim(clearance_key)) > 0),
  CONSTRAINT user_clearances_level_not_blank_chk CHECK (length(btrim(clearance_level)) > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_user_clearances_tenant_user_key
  ON user_management.user_clearances (iq_tenant_id, user_id, clearance_key);

CREATE INDEX IF NOT EXISTS idx_user_clearances_tenant_user
  ON user_management.user_clearances (iq_tenant_id, user_id);
