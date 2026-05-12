-- User Management schema — canonical foundation migration.
-- Aligned with modules/user-management/src/schema/tables.ts (Drizzle).
-- Creates the complete user_management schema from scratch for fresh environments.
--   psql "$DATABASE_URL" -f modules/user-management/migrations/0000_user_management_schema.sql
-- Requires PostgreSQL 13+ (gen_random_uuid).

CREATE SCHEMA IF NOT EXISTS user_management;

-- ─── users ────────────────────────────────────────────────────────────────────
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
  CONSTRAINT users_pkey PRIMARY KEY (iq_tenant_id, id),
  CONSTRAINT users_status_chk CHECK (status IN ('active', 'inactive', 'suspended')),
  CONSTRAINT users_clearance_tier_chk CHECK (clearance_tier_required >= 0 AND clearance_tier_required <= 3)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_users_tenant_username
  ON user_management.users (iq_tenant_id, username);

-- ─── roles ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_management.roles (
  iq_tenant_id uuid NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  code text NOT NULL,
  display_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  CONSTRAINT roles_pkey PRIMARY KEY (iq_tenant_id, id),
  CONSTRAINT roles_code_not_blank_chk CHECK (length(btrim(code)) > 0),
  CONSTRAINT roles_code_canonical_chk CHECK (code = lower(btrim(code)))
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_roles_tenant_code
  ON user_management.roles (iq_tenant_id, code);

-- ─── role_assignments ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_management.role_assignments (
  iq_tenant_id uuid NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  CONSTRAINT role_assignments_pkey PRIMARY KEY (iq_tenant_id, id),
  CONSTRAINT fk_role_assignments_tenant_user
    FOREIGN KEY (iq_tenant_id, user_id)
    REFERENCES user_management.users (iq_tenant_id, id)
    ON DELETE RESTRICT
    ON UPDATE RESTRICT,
  CONSTRAINT fk_role_assignments_tenant_role
    FOREIGN KEY (iq_tenant_id, role_id)
    REFERENCES user_management.roles (iq_tenant_id, id)
    ON DELETE RESTRICT
    ON UPDATE RESTRICT
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_role_assignments_tenant_user_role
  ON user_management.role_assignments (iq_tenant_id, user_id, role_id);

CREATE INDEX IF NOT EXISTS idx_role_assignments_tenant_user
  ON user_management.role_assignments (iq_tenant_id, user_id);

-- ─── role_permissions ─────────────────────────────────────────────────────────
-- permission_slug is an immutable operational identifier consumed directly by Cerbos
-- (e.g. 'um:user:create'). No FK to a permissions catalog — slugs are the source of truth.
CREATE TABLE IF NOT EXISTS user_management.role_permissions (
  iq_tenant_id uuid NOT NULL,
  role_id uuid NOT NULL,
  permission_slug text NOT NULL,
  CONSTRAINT role_permissions_pkey PRIMARY KEY (iq_tenant_id, role_id, permission_slug),
  CONSTRAINT fk_role_permissions_tenant_role
    FOREIGN KEY (iq_tenant_id, role_id)
    REFERENCES user_management.roles (iq_tenant_id, id)
    ON DELETE CASCADE
    ON UPDATE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_tenant_role
  ON user_management.role_permissions (iq_tenant_id, role_id);

-- ─── user_clearances ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_management.user_clearances (
  iq_tenant_id uuid NOT NULL,
  user_id uuid NOT NULL,
  clearance_key text NOT NULL,
  access_level text NOT NULL,
  CONSTRAINT user_clearances_pkey PRIMARY KEY (iq_tenant_id, user_id, clearance_key),
  CONSTRAINT fk_user_clearances_tenant_user
    FOREIGN KEY (iq_tenant_id, user_id)
    REFERENCES user_management.users (iq_tenant_id, id)
    ON DELETE CASCADE
    ON UPDATE RESTRICT
);

-- ─── delegated_capability_grants ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_management.delegated_capability_grants (
  iq_tenant_id uuid NOT NULL,
  delegatee_user_id uuid NOT NULL,
  capability text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  CONSTRAINT delegated_capability_grants_pkey PRIMARY KEY (iq_tenant_id, delegatee_user_id, capability),
  CONSTRAINT fk_delegated_caps_tenant_user
    FOREIGN KEY (iq_tenant_id, delegatee_user_id)
    REFERENCES user_management.users (iq_tenant_id, id)
    ON DELETE CASCADE
    ON UPDATE RESTRICT
);
