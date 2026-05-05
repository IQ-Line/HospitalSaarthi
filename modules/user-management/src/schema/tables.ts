import {
  pgSchema,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  uniqueIndex,
  index,
  check,
  primaryKey,
  date,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { tenantColumn, auditColumns } from "@hims/ts-sdk-db";

export const userManagementSchema = pgSchema("user_management");

// ---------------------------------------------------------------------------
// Platform-owned distributed tables
// ---------------------------------------------------------------------------

export const users = userManagementSchema.table(
  "users",
  {
    ...tenantColumn(),
    id: uuid("id").notNull().defaultRandom(),
    auth_user_id: uuid("auth_user_id"),
    kind: text("kind").notNull().default("user"),
    org_id: uuid("org_id"),
    employee_id: text("employee_id"),
    full_name: text("full_name").notNull(),
    email: text("email"),
    phone: text("phone"),
    status: text("status").notNull().default("active"),
    recovery_tier: text("recovery_tier").notNull().default("admin_only"),
    phone_auth_enabled: boolean("phone_auth_enabled").notNull().default(false),
    must_change_password: boolean("must_change_password").notNull().default(false),
    ...auditColumns(),
  },
  (t) => [
    primaryKey({ columns: [t.iq_tenant_id, t.id] }),
    index("idx_users_auth_user").on(t.iq_tenant_id, t.auth_user_id),
    index("idx_users_email").on(t.iq_tenant_id, t.email),
    index("idx_users_status").on(t.iq_tenant_id, t.status),
    index("idx_users_org").on(t.iq_tenant_id, t.org_id),
    check(
      "chk_users_kind",
      sql`${t.kind} IN ('user', 'service', 'agent')`,
    ),
    check(
      "chk_users_status",
      sql`${t.status} IN ('active', 'inactive', 'suspended')`,
    ),
    check(
      "chk_users_recovery_tier",
      sql`${t.recovery_tier} IN ('standard', 'delegated', 'phone_recovery', 'admin_only', 'federated')`,
    ),
  ],
);

export const roles = userManagementSchema.table(
  "roles",
  {
    ...tenantColumn(),
    id: uuid("id").notNull().defaultRandom(),
    name: text("name").notNull(),
    display_name: text("display_name").notNull(),
    description: text("description"),
    scope_level: text("scope_level").notNull().default("tenant"),
    is_system: boolean("is_system").notNull().default(false),
    status: text("status").notNull().default("active"),
    ...auditColumns(),
  },
  (t) => [
    primaryKey({ columns: [t.iq_tenant_id, t.id] }),
    uniqueIndex("uq_roles_name").on(t.iq_tenant_id, t.name),
    index("idx_roles_scope").on(t.iq_tenant_id, t.scope_level),
    check(
      "chk_roles_scope_level",
      sql`${t.scope_level} IN ('tenant', 'organization')`,
    ),
    check(
      "chk_roles_status",
      sql`${t.status} IN ('active', 'archived')`,
    ),
  ],
);

export const capabilities = userManagementSchema.table(
  "capabilities",
  {
    id: uuid("id").notNull().defaultRandom().primaryKey(),
    module: text("module").notNull(),
    name: text("name").notNull(),
    display_name: text("display_name").notNull(),
    description: text("description"),
    is_assignable: boolean("is_assignable").notNull().default(true),
    sort_order: integer("sort_order").notNull().default(0),
    created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("uq_capabilities_name").on(t.name),
    index("idx_capabilities_module").on(t.module),
  ],
);

export const roleCapabilities = userManagementSchema.table(
  "role_capabilities",
  {
    ...tenantColumn(),
    id: uuid("id").notNull().defaultRandom(),
    role_id: uuid("role_id").notNull(),
    capability_id: uuid("capability_id").notNull(),
    created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    created_by: uuid("created_by"),
  },
  (t) => [
    primaryKey({ columns: [t.iq_tenant_id, t.id] }),
    uniqueIndex("uq_role_capabilities").on(t.iq_tenant_id, t.role_id, t.capability_id),
  ],
);

export const roleAssignments = userManagementSchema.table(
  "role_assignments",
  {
    ...tenantColumn(),
    id: uuid("id").notNull().defaultRandom(),
    user_id: uuid("user_id").notNull(),
    role_id: uuid("role_id").notNull(),
    scope_type: text("scope_type"),
    scope_id: uuid("scope_id"),
    assigned_at: timestamp("assigned_at", { withTimezone: true }).notNull().defaultNow(),
    assigned_by: uuid("assigned_by").notNull(),
    revoked_at: timestamp("revoked_at", { withTimezone: true }),
    revoked_by: uuid("revoked_by"),
  },
  (t) => [
    primaryKey({ columns: [t.iq_tenant_id, t.id] }),
    index("idx_role_assignments_user_active").on(t.iq_tenant_id, t.user_id, t.revoked_at),
    index("idx_role_assignments_role").on(t.iq_tenant_id, t.role_id),
    check(
      "chk_role_assignments_scope_type",
      sql`${t.scope_type} IS NULL OR ${t.scope_type} IN ('department', 'ward')`,
    ),
  ],
);

export const userDepartmentAssignments = userManagementSchema.table(
  "user_department_assignments",
  {
    ...tenantColumn(),
    id: uuid("id").notNull().defaultRandom(),
    user_id: uuid("user_id").notNull(),
    department_id: uuid("department_id").notNull(),
    is_primary: boolean("is_primary").notNull().default(false),
    effective_from: date("effective_from").notNull(),
    effective_to: date("effective_to"),
    created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    created_by: uuid("created_by"),
  },
  (t) => [
    primaryKey({ columns: [t.iq_tenant_id, t.id] }),
    index("idx_dept_assignments_user_active").on(t.iq_tenant_id, t.user_id, t.effective_to),
    index("idx_dept_assignments_dept").on(t.iq_tenant_id, t.department_id),
  ],
);

export const delegations = userManagementSchema.table(
  "delegations",
  {
    ...tenantColumn(),
    id: uuid("id").notNull().defaultRandom(),
    delegator_id: uuid("delegator_id").notNull(),
    delegatee_id: uuid("delegatee_id").notNull(),
    delegation_type: text("delegation_type").notNull(),
    delegated_role_id: uuid("delegated_role_id"),
    delegated_capability_id: uuid("delegated_capability_id"),
    reason: text("reason").notNull(),
    effective_from: timestamp("effective_from", { withTimezone: true }).notNull(),
    effective_to: timestamp("effective_to", { withTimezone: true }).notNull(),
    status: text("status").notNull().default("active"),
    revoked_by: uuid("revoked_by"),
    revoked_at: timestamp("revoked_at", { withTimezone: true }),
    created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    created_by: uuid("created_by"),
  },
  (t) => [
    primaryKey({ columns: [t.iq_tenant_id, t.id] }),
    index("idx_delegations_delegatee_active").on(t.iq_tenant_id, t.delegatee_id, t.status),
    index("idx_delegations_delegator").on(t.iq_tenant_id, t.delegator_id),
    check(
      "chk_delegation_type",
      sql`${t.delegation_type} IN ('role', 'capability')`,
    ),
    check(
      "chk_delegation_target",
      sql`(${t.delegation_type} = 'role' AND ${t.delegated_role_id} IS NOT NULL AND ${t.delegated_capability_id} IS NULL) OR (${t.delegation_type} = 'capability' AND ${t.delegated_capability_id} IS NOT NULL AND ${t.delegated_role_id} IS NULL)`,
    ),
    check(
      "chk_delegation_dates",
      sql`${t.effective_to} > ${t.effective_from}`,
    ),
    check(
      "chk_delegation_self",
      sql`${t.delegator_id} != ${t.delegatee_id}`,
    ),
    check(
      "chk_delegation_status",
      sql`${t.status} IN ('active', 'revoked', 'expired')`,
    ),
  ],
);

export const userClearances = userManagementSchema.table(
  "user_clearances",
  {
    ...tenantColumn(),
    id: uuid("id").notNull().defaultRandom(),
    user_id: uuid("user_id").notNull(),
    clearance_type: text("clearance_type").notNull(),
    clearance_level: text("clearance_level").notNull(),
    granted_by: uuid("granted_by").notNull(),
    granted_at: timestamp("granted_at", { withTimezone: true }).notNull().defaultNow(),
    expires_at: timestamp("expires_at", { withTimezone: true }),
    revoked_at: timestamp("revoked_at", { withTimezone: true }),
    revoked_by: uuid("revoked_by"),
    created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.iq_tenant_id, t.id] }),
    index("idx_clearances_user_active").on(t.iq_tenant_id, t.user_id, t.revoked_at),
    check(
      "chk_clearance_level",
      sql`${t.clearance_level} IN ('view', 'view_and_edit')`,
    ),
  ],
);

// ---------------------------------------------------------------------------
// Projection table
// ---------------------------------------------------------------------------

export const departmentProjection = userManagementSchema.table(
  "department_projection",
  {
    ...tenantColumn(),
    department_id: uuid("department_id").notNull(),
    name: text("name").notNull(),
    code: text("code"),
    parent_department_id: uuid("parent_department_id"),
    is_active: boolean("is_active").notNull().default(true),
    last_synced: timestamp("last_synced", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.iq_tenant_id, t.department_id] }),
    index("idx_dept_projection_parent").on(t.iq_tenant_id, t.parent_department_id),
  ],
);

// ---------------------------------------------------------------------------
// Federation tables
// ---------------------------------------------------------------------------

export const idpConfigurations = userManagementSchema.table(
  "idp_configurations",
  {
    ...tenantColumn(),
    id: uuid("id").notNull().defaultRandom(),
    provider_type: text("provider_type").notNull(),
    provider_name: text("provider_name").notNull(),
    display_name: text("display_name").notNull(),
    client_id: text("client_id").notNull(),
    issuer_url: text("issuer_url").notNull(),
    metadata_url: text("metadata_url"),
    is_active: boolean("is_active").notNull().default(true),
    auto_provision: boolean("auto_provision").notNull().default(true),
    default_role_ids: jsonb("default_role_ids"),
    attribute_mapping: jsonb("attribute_mapping"),
    ...auditColumns(),
  },
  (t) => [
    primaryKey({ columns: [t.iq_tenant_id, t.id] }),
    index("idx_idp_configs_active").on(t.iq_tenant_id, t.is_active),
    check(
      "chk_idp_provider_type",
      sql`${t.provider_type} IN ('oidc', 'saml')`,
    ),
  ],
);

export const scimSyncState = userManagementSchema.table(
  "scim_sync_state",
  {
    ...tenantColumn(),
    id: uuid("id").notNull().defaultRandom(),
    idp_configuration_id: uuid("idp_configuration_id").notNull(),
    last_sync_at: timestamp("last_sync_at", { withTimezone: true }),
    sync_status: text("sync_status").notNull().default("idle"),
    last_error: text("last_error"),
    sync_cursor: text("sync_cursor"),
    created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.iq_tenant_id, t.id] }),
    check(
      "chk_scim_sync_status",
      sql`${t.sync_status} IN ('idle', 'syncing', 'error')`,
    ),
  ],
);

// ---------------------------------------------------------------------------
// Recovery routes
// ---------------------------------------------------------------------------

export const delegatedRecoveryRoutes = userManagementSchema.table(
  "delegated_recovery_routes",
  {
    ...tenantColumn(),
    id: uuid("id").notNull().defaultRandom(),
    user_id: uuid("user_id").notNull(),
    base_email_id: uuid("base_email_id").notNull(),
    address: text("address").notNull(),
    verified: boolean("verified").notNull().default(false),
    last_delivery_check: timestamp("last_delivery_check", { withTimezone: true }),
    created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.iq_tenant_id, t.id] }),
    uniqueIndex("idx_recovery_routes_user").on(t.iq_tenant_id, t.user_id),
  ],
);

// ---------------------------------------------------------------------------
// Identity links (federation account linking)
// ---------------------------------------------------------------------------

export const authIdentityLinks = userManagementSchema.table(
  "auth_identity_links",
  {
    ...tenantColumn(),
    id: uuid("id").notNull().defaultRandom(),
    user_id: uuid("user_id").notNull(),
    auth_user_id: uuid("auth_user_id").notNull(),
    provider_id: text("provider_id").notNull(),
    issuer: text("issuer").notNull(),
    subject: text("subject").notNull(),
    claim_snapshot: jsonb("claim_snapshot"),
    linked_by: uuid("linked_by").notNull(),
    linked_at: timestamp("linked_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.iq_tenant_id, t.id] }),
    uniqueIndex("idx_identity_links_provider_subject").on(t.iq_tenant_id, t.provider_id, t.subject),
    index("idx_identity_links_user").on(t.iq_tenant_id, t.user_id),
  ],
);

// ---------------------------------------------------------------------------
// Audit
// ---------------------------------------------------------------------------

export const permissionChangeAudit = userManagementSchema.table(
  "permission_change_audit",
  {
    ...tenantColumn(),
    id: uuid("id").notNull().defaultRandom(),
    entity_type: text("entity_type").notNull(),
    entity_id: uuid("entity_id").notNull(),
    action: text("action").notNull(),
    changed_by: uuid("changed_by").notNull(),
    changed_at: timestamp("changed_at", { withTimezone: true }).notNull().defaultNow(),
    old_value: jsonb("old_value"),
    new_value: jsonb("new_value"),
    reason: text("reason"),
  },
  (t) => [
    primaryKey({ columns: [t.iq_tenant_id, t.id] }),
    index("idx_audit_entity").on(t.iq_tenant_id, t.entity_type, t.entity_id),
    index("idx_audit_changed_at").on(t.iq_tenant_id, t.changed_at),
    index("idx_audit_changed_by").on(t.iq_tenant_id, t.changed_by),
    check(
      "chk_audit_entity_type",
      sql`${t.entity_type} IN ('role_assignment', 'role_capability', 'delegation', 'clearance', 'user_status', 'role')`,
    ),
    check(
      "chk_audit_action",
      sql`${t.action} IN ('created', 'updated', 'revoked', 'expired')`,
    ),
  ],
);

// ---------------------------------------------------------------------------
// better-auth managed tables
// ---------------------------------------------------------------------------

export const baUsers = userManagementSchema.table(
  "ba_users",
  {
    id: uuid("id").notNull().primaryKey(),
    username: text("username").notNull(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    email_verified: boolean("email_verified").notNull().default(false),
    image: text("image"),
    created_at: timestamp("created_at", { withTimezone: true }).notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (t) => [
    uniqueIndex("idx_ba_users_username").on(t.username),
  ],
);

export const baSessions = userManagementSchema.table(
  "ba_sessions",
  {
    id: uuid("id").notNull().primaryKey(),
    user_id: uuid("user_id").notNull(),
    token: text("token").notNull(),
    expires_at: timestamp("expires_at", { withTimezone: true }).notNull(),
    ip_address: text("ip_address"),
    user_agent: text("user_agent"),
    created_at: timestamp("created_at", { withTimezone: true }).notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
);

export const baAccounts = userManagementSchema.table(
  "ba_accounts",
  {
    id: uuid("id").notNull().primaryKey(),
    user_id: uuid("user_id").notNull(),
    account_id: text("account_id").notNull(),
    provider_id: text("provider_id").notNull(),
    access_token: text("access_token"),
    refresh_token: text("refresh_token"),
    access_token_expires_at: timestamp("access_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    id_token: text("id_token"),
    created_at: timestamp("created_at", { withTimezone: true }).notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
);

export const jwks = userManagementSchema.table(
  "jwks",
  {
    id: text("id").notNull().primaryKey(),
    publicKey: text("publicKey").notNull(),
    privateKey: text("privateKey").notNull(),
    createdAt: timestamp("createdAt", { withTimezone: true }).notNull(),
    expiresAt: timestamp("expiresAt", { withTimezone: true }),
  },
);
