import {
  auditColumns,
  pgSchema,
  uuid,
  text,
  jsonb,
  uniqueIndex,
  index,
  check,
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
  ],
);

// ---------------------------------------------------------------------------
// Next: Projection tables (synced from Master Data events) — see LLD §1, §10
//   module_projection, config_schema_projection, feature_flag_projection
//
// Next: Distributed tables (by iq_tenant_id) — see LLD §3–§9
//   tenant_modules, tenant_feature_flags, tenant_module_configs,
//   integration_profiles, tenant_provisioning_log, config_change_audit
// ---------------------------------------------------------------------------
