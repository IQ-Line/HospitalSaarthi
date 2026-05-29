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
  tenantColumn,
  timestamp,
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
