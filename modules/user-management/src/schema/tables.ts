import { tenantColumn, auditColumns } from "@hims/ts-sdk-db";
import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  foreignKey,
  index,
  integer,
  pgSchema,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import type { CapabilityOverrideEffect, RecoveryTier, RoleStatus } from "../domain/types.js";

/** Capability-first authorization schema for the User Management module. */
export const userManagementSchema = pgSchema("user_management");

function createdAt(name = "created_at") {
  return timestamp(name, { withTimezone: true }).notNull().defaultNow();
}

function updatedAt(name = "updated_at") {
  return timestamp(name, { withTimezone: true }).notNull().defaultNow();
}

export const users = userManagementSchema.table(
  "users",
  {
    ...tenantColumn(),
    id: uuid("id").notNull().defaultRandom(),
    full_name: text("full_name").notNull(),
    email: text("email"),
    phone: text("phone"),
    /** better-auth / external identity anchor (nullable until linked). */
    auth_user_id: uuid("auth_user_id"),
    status: text("status").notNull().default("active"),
    /** Login handle; unique per tenant when set (multiple NULLs allowed). */
    username: text("username"),
    /**
     * Account-recovery tier (authn spec §3.2). MVP emits only 'standard' (user has a real email →
     * self-serve reset later) or 'admin_only' (no real email → admin-driven reset). The other tiers
     * (delegated/phone_recovery/federated) arrive with their Phase-2/3 recovery flows; the CHECK
     * widens then. Derived at creation from whether a real email was supplied (not honestly
     * backfillable afterwards, hence written now even though no reader exists this pass).
     */
    recovery_tier: text("recovery_tier").$type<RecoveryTier>().notNull().default("standard"),
    /** When true, user must change password on next successful login (admin reset flow). */
    must_change_password: boolean("must_change_password").notNull().default(false),
    /** Configurator `organizations.id` — logical reference only (no FK). */
    org_id: uuid("org_id"),
    /** Department-scoped ABAC field. */
    department: text("department"),
    /** Minimum effective clearance tier required for sensitive user resources. */
    clearance_tier_required: integer("clearance_tier_required").notNull().default(0),
    api_key_prefix: text("api_key_prefix"),
    api_key_hash: text("api_key_hash"),
    ...auditColumns(),
  },
  (t) => [
    primaryKey({ columns: [t.iq_tenant_id, t.id] }),
    check("users_status_chk", sql`${t.status} in ('active', 'inactive', 'suspended')`),
    check(
      "users_clearance_tier_chk",
      sql`${t.clearance_tier_required} >= 0 and ${t.clearance_tier_required} <= 3`,
    ),
    check("users_recovery_tier_chk", sql`${t.recovery_tier} in ('standard', 'admin_only')`),
    unique("uq_users_tenant_username").on(t.iq_tenant_id, t.username),
    index("idx_users_api_key_prefix")
      .on(t.api_key_prefix)
      .where(sql`${t.api_key_prefix} is not null and ${t.status} = 'active'`),
  ],
);

export const capabilities = userManagementSchema.table(
  "capabilities",
  {
    id: uuid("id").notNull().defaultRandom(),
    capability_key: text("capability_key").notNull(),
    module: text("module").notNull(),
    feature: text("feature").notNull(),
    action: text("action").notNull(),
    display_name: text("display_name").notNull(),
    description: text("description"),
    is_active: boolean("is_active").notNull().default(true),
    source_module_slug: text("source_module_slug"),
    source_permission_slug: text("source_permission_slug"),
    source_catalog: text("source_catalog"),
    created_at: createdAt(),
    updated_at: updatedAt(),
  },
  (t) => [
    primaryKey({ columns: [t.id] }),
    check("capabilities_key_not_blank_chk", sql`length(btrim(${t.capability_key})) > 0`),
    check(
      "capabilities_key_canonical_chk",
      sql`${t.capability_key} = lower(btrim(${t.capability_key}))`,
    ),
    check("capabilities_module_not_blank_chk", sql`length(btrim(${t.module})) > 0`),
    check("capabilities_feature_not_blank_chk", sql`length(btrim(${t.feature})) > 0`),
    check("capabilities_action_not_blank_chk", sql`length(btrim(${t.action})) > 0`),
    check("capabilities_display_name_not_blank_chk", sql`length(btrim(${t.display_name})) > 0`),
    check(
      "capabilities_source_catalog_chk",
      sql`${t.source_catalog} is null or ${t.source_catalog} in ('master_data')`,
    ),
    unique("uq_capabilities_key").on(t.capability_key),
    unique("uq_capabilities_module_feature_action").on(t.module, t.feature, t.action),
    index("idx_capabilities_module_feature").on(t.module, t.feature),
  ],
);

export const roles = userManagementSchema.table(
  "roles",
  {
    ...tenantColumn(),
    id: uuid("id").notNull().defaultRandom(),
    code: text("code").notNull(),
    role_type: text("role_type").notNull(),
    display_name: text("display_name").notNull(),
    description: text("description"),
    is_system: boolean("is_system").notNull().default(false),
    status: text("status").$type<RoleStatus>().notNull().default("active"),
    created_at: createdAt(),
    updated_at: updatedAt(),
  },
  (t) => [
    primaryKey({ columns: [t.iq_tenant_id, t.id] }),
    check("roles_code_not_blank_chk", sql`length(btrim(${t.code})) > 0`),
    check("roles_code_canonical_chk", sql`${t.code} = lower(btrim(${t.code}))`),
    check("roles_role_type_not_blank_chk", sql`length(btrim(${t.role_type})) > 0`),
    check("roles_role_type_canonical_chk", sql`${t.role_type} = lower(btrim(${t.role_type}))`),
    check("roles_display_name_not_blank_chk", sql`length(btrim(${t.display_name})) > 0`),
    check("roles_status_chk", sql`${t.status} in ('active', 'inactive')`),
    unique("uq_roles_tenant_code").on(t.iq_tenant_id, t.code),
    index("idx_roles_tenant_status").on(t.iq_tenant_id, t.status),
    index("idx_roles_tenant_role_type").on(t.iq_tenant_id, t.role_type),
  ],
);

export const role_capabilities = userManagementSchema.table(
  "role_capabilities",
  {
    ...tenantColumn(),
    id: uuid("id").notNull().defaultRandom(),
    role_id: uuid("role_id").notNull(),
    capability_id: uuid("capability_id").notNull(),
    created_at: createdAt(),
  },
  (t) => [
    primaryKey({ columns: [t.iq_tenant_id, t.id] }),
    foreignKey({
      name: "fk_role_capabilities_tenant_role",
      columns: [t.iq_tenant_id, t.role_id],
      foreignColumns: [roles.iq_tenant_id, roles.id],
    })
      .onDelete("cascade")
      .onUpdate("restrict"),
    foreignKey({
      name: "fk_role_capabilities_capability",
      columns: [t.capability_id],
      foreignColumns: [capabilities.id],
    })
      .onDelete("restrict")
      .onUpdate("restrict"),
    unique("uq_role_capabilities_tenant_role_capability").on(
      t.iq_tenant_id,
      t.role_id,
      t.capability_id,
    ),
    index("idx_role_capabilities_tenant_role").on(t.iq_tenant_id, t.role_id),
    index("idx_role_capabilities_capability").on(t.capability_id),
  ],
);

export const user_roles = userManagementSchema.table(
  "user_roles",
  {
    ...tenantColumn(),
    id: uuid("id").notNull().defaultRandom(),
    user_id: uuid("user_id").notNull(),
    role_id: uuid("role_id").notNull(),
    assigned_by_user_id: uuid("assigned_by_user_id"),
    assigned_at: timestamp("assigned_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.iq_tenant_id, t.id] }),
    foreignKey({
      name: "fk_user_roles_tenant_user",
      columns: [t.iq_tenant_id, t.user_id],
      foreignColumns: [users.iq_tenant_id, users.id],
    })
      .onDelete("restrict")
      .onUpdate("restrict"),
    foreignKey({
      name: "fk_user_roles_tenant_role",
      columns: [t.iq_tenant_id, t.role_id],
      foreignColumns: [roles.iq_tenant_id, roles.id],
    })
      .onDelete("restrict")
      .onUpdate("restrict"),
    foreignKey({
      name: "fk_user_roles_tenant_assigned_by_user",
      columns: [t.iq_tenant_id, t.assigned_by_user_id],
      foreignColumns: [users.iq_tenant_id, users.id],
    })
      .onDelete("restrict")
      .onUpdate("restrict"),
    unique("uq_user_roles_tenant_user_role").on(t.iq_tenant_id, t.user_id, t.role_id),
    index("idx_user_roles_tenant_user").on(t.iq_tenant_id, t.user_id),
    index("idx_user_roles_tenant_role").on(t.iq_tenant_id, t.role_id),
  ],
);

/**
 * Per-user capability OVERRIDES (ADR-0037). Exactly one row per (tenant, user, capability),
 * pinning that user's effective access for the capability ON (`effect='grant'`) or OFF
 * (`effect='deny'`), independent of any role. Role-derived capabilities are NOT stored here;
 * they are read live from `role_capabilities` at principal hydration. Deny wins over grant and
 * over delegation at read time.
 */
export const user_capabilities = userManagementSchema.table(
  "user_capabilities",
  {
    ...tenantColumn(),
    id: uuid("id").notNull().defaultRandom(),
    user_id: uuid("user_id").notNull(),
    capability_id: uuid("capability_id").notNull(),
    effect: text("effect").$type<CapabilityOverrideEffect>().notNull(),
    reason: text("reason"),
    granted_by_user_id: uuid("granted_by_user_id"),
    granted_at: timestamp("granted_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.iq_tenant_id, t.id] }),
    foreignKey({
      name: "fk_user_capabilities_tenant_user",
      columns: [t.iq_tenant_id, t.user_id],
      foreignColumns: [users.iq_tenant_id, users.id],
    })
      .onDelete("restrict")
      .onUpdate("restrict"),
    foreignKey({
      name: "fk_user_capabilities_capability",
      columns: [t.capability_id],
      foreignColumns: [capabilities.id],
    })
      .onDelete("restrict")
      .onUpdate("restrict"),
    foreignKey({
      name: "fk_user_capabilities_tenant_granted_by_user",
      columns: [t.iq_tenant_id, t.granted_by_user_id],
      foreignColumns: [users.iq_tenant_id, users.id],
    })
      .onDelete("restrict")
      .onUpdate("restrict"),
    check("user_capabilities_effect_chk", sql`${t.effect} in ('grant', 'deny')`),
    unique("uq_user_capabilities_tenant_user_capability").on(
      t.iq_tenant_id,
      t.user_id,
      t.capability_id,
    ),
    index("idx_user_capabilities_tenant_user").on(t.iq_tenant_id, t.user_id),
    index("idx_user_capabilities_tenant_capability").on(t.iq_tenant_id, t.capability_id),
  ],
);

export const delegated_capability_grants = userManagementSchema.table(
  "delegated_capability_grants",
  {
    ...tenantColumn(),
    id: uuid("id").notNull().defaultRandom(),
    source_user_id: uuid("source_user_id").notNull(),
    target_user_id: uuid("target_user_id").notNull(),
    capability_id: uuid("capability_id").notNull(),
    starts_at: timestamp("starts_at", { withTimezone: true }).notNull().defaultNow(),
    ends_at: timestamp("ends_at", { withTimezone: true }),
    status: text("status").notNull().default("active"),
    created_at: createdAt(),
  },
  (t) => [
    primaryKey({ columns: [t.iq_tenant_id, t.id] }),
    foreignKey({
      name: "fk_delegated_grants_tenant_source_user",
      columns: [t.iq_tenant_id, t.source_user_id],
      foreignColumns: [users.iq_tenant_id, users.id],
    })
      .onDelete("restrict")
      .onUpdate("restrict"),
    foreignKey({
      name: "fk_delegated_grants_tenant_target_user",
      columns: [t.iq_tenant_id, t.target_user_id],
      foreignColumns: [users.iq_tenant_id, users.id],
    })
      .onDelete("restrict")
      .onUpdate("restrict"),
    foreignKey({
      name: "fk_delegated_grants_capability",
      columns: [t.capability_id],
      foreignColumns: [capabilities.id],
    })
      .onDelete("restrict")
      .onUpdate("restrict"),
    check(
      "delegated_capability_grants_status_chk",
      sql`${t.status} in ('pending', 'active', 'revoked', 'expired')`,
    ),
    check(
      "delegated_capability_grants_window_chk",
      sql`${t.ends_at} is null or ${t.ends_at} > ${t.starts_at}`,
    ),
    unique("uq_delegated_grants_tenant_source_target_capability_start").on(
      t.iq_tenant_id,
      t.source_user_id,
      t.target_user_id,
      t.capability_id,
      t.starts_at,
    ),
    index("idx_delegated_grants_tenant_target_status").on(
      t.iq_tenant_id,
      t.target_user_id,
      t.status,
    ),
  ],
);

export const user_clearances = userManagementSchema.table(
  "user_clearances",
  {
    ...tenantColumn(),
    id: uuid("id").notNull().defaultRandom(),
    user_id: uuid("user_id").notNull(),
    clearance_key: text("clearance_key").notNull(),
    clearance_level: text("clearance_level").notNull(),
    created_at: createdAt(),
  },
  (t) => [
    primaryKey({ columns: [t.iq_tenant_id, t.id] }),
    foreignKey({
      name: "fk_user_clearances_tenant_user",
      columns: [t.iq_tenant_id, t.user_id],
      foreignColumns: [users.iq_tenant_id, users.id],
    })
      .onDelete("cascade")
      .onUpdate("restrict"),
    check("user_clearances_key_not_blank_chk", sql`length(btrim(${t.clearance_key})) > 0`),
    check(
      "user_clearances_level_not_blank_chk",
      sql`length(btrim(${t.clearance_level})) > 0`,
    ),
    unique("uq_user_clearances_tenant_user_key").on(t.iq_tenant_id, t.user_id, t.clearance_key),
    index("idx_user_clearances_tenant_user").on(t.iq_tenant_id, t.user_id),
  ],
);

/**
 * Platform operators — the bounded `scope:platform` membership table.
 *
 * Tenant-LESS by design: membership is a platform fact keyed by the operator's GLOBAL platform
 * user id (`users.id`), not scoped to any tenant. A row here is the ONLY source of the JWT
 * `scopes:["platform"]` claim (issuance) and the Cerbos `principal.attr.scopes` enrichment. It
 * carries no capabilities — authority is expressed purely as an additive PDP scope allow on the
 * platform-provisioning surfaces (configurator + master_data global catalog); clinical resources
 * remain out of reach. Replaces the former god-mode super-admin (a seed granting every catalog
 * capability). No FK to `users` — `users` is Citus-distributed by `iq_tenant_id`, so a tenant-less
 * table cannot reference it; membership integrity is enforced by the seed/admin write path.
 *
 * Citus: a reference table (replicated to all nodes), matching `capabilities`. It is a small,
 * globally-read, tenant-less lookup — the canonical Citus shape for this — and is never joined to
 * distributed tables in a shard-local way.
 */
export const platform_admins = userManagementSchema.table("platform_admins", {
  /** Global platform user id (`user_management.users.id`). Tenant-less. */
  user_id: uuid("user_id").primaryKey(),
  granted_at: timestamp("granted_at", { withTimezone: true }).notNull().defaultNow(),
  /** Global platform user id of the granting operator, when known. */
  granted_by: uuid("granted_by"),
  note: text("note"),
});
