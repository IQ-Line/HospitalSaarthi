import {
  auditColumns,
  pgSchema,
  uuid,
  text,
  jsonb,
  boolean,
  uniqueIndex,
  index,
  check,
  primaryKey,
  foreignKey,
  tenantColumn,
  timestamp,
  smallint,
  sql,
} from "@hims/ts-sdk-db";

export const configuratorSchema = pgSchema("configurator");

// ---------------------------------------------------------------------------
// Reference tables — MVP
// ---------------------------------------------------------------------------

export const organizations = configuratorSchema.table(
  "organizations",
  {
    id: uuid("id").notNull().defaultRandom().primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    type: text("type").notNull(),
    status: text("status").notNull().default("active"),
    contact_email: text("contact_email"),
    website: text("website"),
    contact_phone: text("contact_phone"),
    address: text("address"),
    metadata: jsonb("metadata"),
    ...auditColumns(),
  },
  (t) => [
    uniqueIndex("idx_organizations_slug").on(t.slug),
    index("idx_organizations_status").on(t.status),
    check(
      "chk_organizations_type",
      sql`${t.type} IN ('hospital_chain', 'medical_college', 'standalone_hospital', 'government_network')`,
    ),
    check(
      "chk_organizations_status",
      sql`${t.status} IN ('active', 'suspended', 'decommissioned')`,
    ),
  ],
);

export const tenants = configuratorSchema.table(
  "tenants",
  {
    iq_tenant_id: uuid("iq_tenant_id").notNull().defaultRandom().primaryKey(),
    org_id: uuid("org_id").notNull(),
    parent_tenant_id: uuid("parent_tenant_id"),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    type: text("type").notNull(),
    provisioning_status: text("provisioning_status").notNull().default("provisioning"),
    data_isolation_level: text("data_isolation_level").notNull().default("shared"),
    cerbos_scope_key: text("cerbos_scope_key").notNull(),
    timezone: text("timezone").notNull().default("Asia/Kolkata"),
    locale: text("locale").notNull().default("en-IN"),
    metadata: jsonb("metadata"),
    branch_code: text("branch_code"),
    branch_type: text("branch_type"),
    address_line1: text("address_line1"),
    city: text("city"),
    state: text("state"),
    pin_code: text("pin_code"),
    contact_phone: text("contact_phone"),
    contact_email: text("contact_email"),
    tenant_numeric_code: text("tenant_numeric_code"),
    free_follow_up_days: smallint("free_follow_up_days").notNull().default(15),
    free_follow_up_visits: smallint("free_follow_up_visits").notNull().default(1),
    ...auditColumns(),
  },
  (t) => [
    uniqueIndex("idx_tenants_slug").on(t.slug),
    index("idx_tenants_org").on(t.org_id),
    index("idx_tenants_parent").on(t.parent_tenant_id),
    index("idx_tenants_status").on(t.provisioning_status),
    uniqueIndex("idx_tenants_cerbos_scope").on(t.cerbos_scope_key),
    check(
      "chk_tenants_type",
      sql`${t.type} IN ('full_platform', 'fragmented', 'lite')`,
    ),
    check(
      "chk_tenants_provisioning_status",
      sql`${t.provisioning_status} IN ('provisioning', 'active', 'suspended', 'decommissioned')`,
    ),
    check(
      "chk_tenants_data_isolation_level",
      sql`${t.data_isolation_level} IN ('shared', 'isolated')`,
    ),
    check(
      "chk_tenants_branch_type",
      sql`${t.branch_type} IS NULL OR ${t.branch_type} IN ('hub_lab', 'hub', 'satellite')`,
    ),
    // Restored from old hand-written migration 006_configurator_tenant_org_fk.sql:
    // every tenant belongs to exactly one organisation (reference -> reference FK).
    foreignKey({
      name: "fk_tenants_organization",
      columns: [t.org_id],
      foreignColumns: [organizations.id],
    }),
    // Restored from 006: parent tenant within the same org (self-referential
    // reference -> reference FK; NULL = root tenant, branches reference a root).
    foreignKey({
      name: "fk_tenants_parent_tenant",
      columns: [t.parent_tenant_id],
      foreignColumns: [t.iq_tenant_id],
    }),
  ],
);

export const tenantModules = configuratorSchema.table(
  "tenant_modules",
  {
    ...tenantColumn(),
    module_id: uuid("module_id").notNull(),
    is_active: boolean("is_active").notNull().default(true),
    is_core_override: boolean("is_core_override").notNull().default(false),
    ...auditColumns(),
  },
  (t) => [
    primaryKey({ columns: [t.iq_tenant_id, t.module_id] }),
    index("idx_tenant_modules_active").on(t.iq_tenant_id, t.is_active),
    check(
      "chk_tenant_modules_core_always_active",
      sql`NOT (${t.is_core_override} AND NOT ${t.is_active})`,
    ),
  ],
);

export const tenantIntegrationProfiles = configuratorSchema.table(
  "tenant_integration_profiles",
  {
    id: uuid("id").notNull().defaultRandom().primaryKey(),
    ...tenantColumn(),
    integration_kind: text("integration_kind").notNull(),
    is_active: boolean("is_active").notNull().default(true),
    hip_id: text("hip_id").notNull(),
    hiu_id: text("hiu_id").notNull(),
    cm_id: text("cm_id").notNull().default("sbx"),
    client_id: text("client_id"),
    client_secret: text("client_secret"),
    default_sms_phone: text("default_sms_phone"),
    hip_display_name: text("hip_display_name"),
    callback_base_url: text("callback_base_url"),
    sms_provider: text("sms_provider"),
    sms_config: jsonb("sms_config").notNull().default({}),
    gateway_environment: text("gateway_environment").notNull().default("sandbox"),
    ...auditColumns(),
  },
  (t) => [
    uniqueIndex("idx_tenant_integration_profiles_tenant_kind").on(
      t.iq_tenant_id,
      t.integration_kind,
    ),
    uniqueIndex("idx_tenant_integration_profiles_hip_active")
      .on(t.hip_id)
      .where(sql`${t.integration_kind} = 'abdm' AND ${t.is_active} = true`),
    index("idx_tenant_integration_profiles_tenant").on(t.iq_tenant_id),
    check(
      "chk_tenant_integration_profiles_kind",
      sql`${t.integration_kind} IN ('abdm')`,
    ),
    // Restored from old hand-written migration 007_configurator_tenant_integration_profiles.sql
    // (inline `iq_tenant_id ... REFERENCES configurator.tenants (iq_tenant_id)`).
    // Reference -> reference FK, which Citus allows.
    foreignKey({
      name: "fk_tenant_integration_profiles_tenant",
      columns: [t.iq_tenant_id],
      foreignColumns: [tenants.iq_tenant_id],
    }),
  ],
);

export const tenantApiKeys = configuratorSchema.table(
  "tenant_api_keys",
  {
    api_key_id: uuid("api_key_id").notNull().defaultRandom().primaryKey(),
    ...tenantColumn(),
    key_prefix: text("key_prefix").notNull(),
    key_hash: text("key_hash").notNull(),
    label: text("label"),
    purpose: text("purpose").notNull().default("opd_slip"),
    environment: text("environment").notNull(),
    status: text("status").notNull().default("active"),
    expires_at: timestamp("expires_at", { withTimezone: true }),
    last_used_at: timestamp("last_used_at", { withTimezone: true }),
    ...auditColumns(),
  },
  (t) => [
    uniqueIndex("idx_tenant_api_keys_prefix").on(t.key_prefix),
    index("idx_tenant_api_keys_tenant").on(t.iq_tenant_id),
    index("idx_tenant_api_keys_tenant_status").on(t.iq_tenant_id, t.status),
    check("chk_tenant_api_keys_purpose", sql`${t.purpose} IN ('opd_slip')`),
    check("chk_tenant_api_keys_environment", sql`${t.environment} IN ('live', 'test')`),
    check(
      "chk_tenant_api_keys_status",
      sql`${t.status} IN ('active', 'disabled', 'revoked')`,
    ),
    // Restored from old hand-written migration 010_tenant_api_keys.sql
    // (inline `iq_tenant_id ... REFERENCES configurator.tenants (iq_tenant_id)`).
    // Reference -> reference FK, which Citus allows.
    foreignKey({
      name: "fk_tenant_api_keys_tenant",
      columns: [t.iq_tenant_id],
      foreignColumns: [tenants.iq_tenant_id],
    }),
  ],
);

export const sequenceConfiguration = configuratorSchema.table(
  "sequence_configuration",
  {
    iq_tenant_id: uuid("iq_tenant_id")
      .notNull()
      .primaryKey()
      .references(() => tenants.iq_tenant_id),
    status: text("status").notNull().default("default"),
    configured_at: timestamp("configured_at", { withTimezone: true }),
    identifier_overrides: jsonb("identifier_overrides").notNull().default({}),
    ...auditColumns(),
  },
  (t) => [
    index("idx_sequence_configuration_status").on(t.status),
    check(
      "chk_sequence_configuration_status",
      sql`${t.status} IN ('default', 'configured')`,
    ),
  ],
);

// ---------------------------------------------------------------------------
// Next: Projection tables (synced from Master Data events) — see LLD §1, §10
//   config_schema_projection, feature_flag_projection
//
// Next: Distributed tables (by iq_tenant_id) — see LLD §3–§9
//   tenant_feature_flags, tenant_module_configs,
//   integration_profiles, tenant_provisioning_log, config_change_audit
// ---------------------------------------------------------------------------
