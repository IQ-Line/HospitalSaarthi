import {
  pgSchema,
  uuid,
  text,
  timestamp,
  boolean,
  jsonb,
  uniqueIndex,
  index,
  check,
  primaryKey,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { tenantColumn, auditColumns } from "@hims/ts-sdk-db";

export const configuratorSchema = pgSchema("configurator");

// ---------------------------------------------------------------------------
// Reference tables
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
// Projection tables (synced from Master Data events)
// ---------------------------------------------------------------------------

export const moduleProjection = configuratorSchema.table(
  "module_projection",
  {
    id: uuid("id").notNull().primaryKey(),
    name: text("name").notNull(),
    display_name: text("display_name").notNull(),
    category: text("category").notNull(),
    is_core: boolean("is_core").notNull(),
    version: text("version").notNull(),
    synced_at: timestamp("synced_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("idx_module_projection_name").on(t.name),
    check(
      "chk_module_projection_category",
      sql`${t.category} IN ('core', 'clinical', 'administrative', 'support')`,
    ),
  ],
);

export const configSchemaProjection = configuratorSchema.table(
  "config_schema_projection",
  {
    id: uuid("id").notNull().defaultRandom().primaryKey(),
    module_id: uuid("module_id").notNull(),
    schema_version: text("schema_version").notNull(),
    config_schema: jsonb("config_schema").notNull(),
    defaults: jsonb("defaults").notNull(),
    synced_at: timestamp("synced_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("idx_config_schema_projection_module_version").on(
      t.module_id,
      t.schema_version,
    ),
  ],
);

export const featureFlagProjection = configuratorSchema.table(
  "feature_flag_projection",
  {
    id: uuid("id").notNull().primaryKey(),
    name: text("name").notNull(),
    flag_type: text("flag_type").notNull(),
    default_value: jsonb("default_value").notNull(),
    module_id: uuid("module_id"),
    value_schema: jsonb("value_schema"),
    synced_at: timestamp("synced_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("idx_feature_flag_projection_name").on(t.name),
    index("idx_feature_flag_projection_module").on(t.module_id),
    check(
      "chk_feature_flag_projection_type",
      sql`${t.flag_type} IN ('boolean', 'percentage', 'string', 'json')`,
    ),
  ],
);

// ---------------------------------------------------------------------------
// Distributed tables (by iq_tenant_id)
// ---------------------------------------------------------------------------

export const tenantModules = configuratorSchema.table(
  "tenant_modules",
  {
    ...tenantColumn(),
    module_id: uuid("module_id").notNull(),
    is_enabled: boolean("is_enabled").notNull().default(true),
    is_core_override: boolean("is_core_override").notNull().default(false),
    enabled_at: timestamp("enabled_at", { withTimezone: true }),
    disabled_at: timestamp("disabled_at", { withTimezone: true }),
    enabled_by: uuid("enabled_by"),
    created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    updated_by: uuid("updated_by"),
  },
  (t) => [
    primaryKey({ columns: [t.iq_tenant_id, t.module_id] }),
    index("idx_tenant_modules_enabled").on(t.iq_tenant_id, t.is_enabled),
    check(
      "chk_core_module_always_enabled",
      sql`NOT (${t.is_core_override} AND NOT ${t.is_enabled})`,
    ),
  ],
);

export const tenantFeatureFlags = configuratorSchema.table(
  "tenant_feature_flags",
  {
    ...tenantColumn(),
    feature_flag_id: uuid("feature_flag_id").notNull(),
    value: jsonb("value").notNull(),
    is_enabled: boolean("is_enabled").notNull().default(true),
    enabled_at: timestamp("enabled_at", { withTimezone: true }),
    enabled_by: uuid("enabled_by"),
    created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    updated_by: uuid("updated_by"),
  },
  (t) => [
    primaryKey({ columns: [t.iq_tenant_id, t.feature_flag_id] }),
    index("idx_tenant_feature_flags_enabled").on(t.iq_tenant_id, t.is_enabled),
  ],
);

export const tenantModuleConfigs = configuratorSchema.table(
  "tenant_module_configs",
  {
    ...tenantColumn(),
    module_id: uuid("module_id").notNull(),
    config_values: jsonb("config_values").notNull().default({}),
    schema_version: text("schema_version").notNull().default("1.0.0"),
    etag: text("etag").notNull(),
    ...auditColumns(),
  },
  (t) => [primaryKey({ columns: [t.iq_tenant_id, t.module_id] })],
);

export const integrationProfiles = configuratorSchema.table(
  "integration_profiles",
  {
    ...tenantColumn(),
    id: uuid("id").notNull().defaultRandom(),
    name: text("name").notNull(),
    target_system: text("target_system").notNull(),
    protocol: text("protocol").notNull(),
    protocol_version: text("protocol_version"),
    direction: text("direction").notNull(),
    connection_config: jsonb("connection_config").notNull(),
    credential_vault_ref: text("credential_vault_ref"),
    mapping_rules: jsonb("mapping_rules"),
    is_active: boolean("is_active").notNull().default(true),
    ...auditColumns(),
  },
  (t) => [
    primaryKey({ columns: [t.iq_tenant_id, t.id] }),
    index("idx_integration_profiles_protocol").on(t.iq_tenant_id, t.protocol),
    index("idx_integration_profiles_active").on(t.iq_tenant_id, t.is_active),
    index("idx_integration_profiles_target").on(t.iq_tenant_id, t.target_system),
    check(
      "chk_integration_profiles_protocol",
      sql`${t.protocol} IN ('fhir', 'hl7v2', 'dicom', 'rest', 'custom')`,
    ),
    check(
      "chk_integration_profiles_direction",
      sql`${t.direction} IN ('inbound', 'outbound', 'bidirectional')`,
    ),
  ],
);

export const tenantProvisioningLog = configuratorSchema.table(
  "tenant_provisioning_log",
  {
    ...tenantColumn(),
    id: uuid("id").notNull().defaultRandom(),
    step: text("step").notNull(),
    status: text("status").notNull().default("pending"),
    started_at: timestamp("started_at", { withTimezone: true }),
    completed_at: timestamp("completed_at", { withTimezone: true }),
    error_details: text("error_details"),
    initiated_by: uuid("initiated_by").notNull(),
    created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.iq_tenant_id, t.id] }),
    index("idx_tenant_provisioning_log_status").on(t.iq_tenant_id, t.status),
    index("idx_tenant_provisioning_log_step").on(t.iq_tenant_id, t.step),
    check(
      "chk_provisioning_log_step",
      sql`${t.step} IN ('org_created', 'tenant_created', 'core_modules_seeded', 'feature_flags_seeded', 'admin_user_created', 'event_published', 'downstream_acknowledged')`,
    ),
    check(
      "chk_provisioning_log_status",
      sql`${t.status} IN ('pending', 'in_progress', 'completed', 'failed', 'skipped')`,
    ),
  ],
);

export const configChangeAudit = configuratorSchema.table(
  "config_change_audit",
  {
    ...tenantColumn(),
    id: uuid("id").notNull().defaultRandom(),
    entity_type: text("entity_type").notNull(),
    entity_id: uuid("entity_id").notNull(),
    action: text("action").notNull(),
    old_value: jsonb("old_value"),
    new_value: jsonb("new_value"),
    reason: text("reason"),
    changed_by: uuid("changed_by").notNull(),
    changed_at: timestamp("changed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.iq_tenant_id, t.id] }),
    index("idx_config_change_audit_type").on(t.iq_tenant_id, t.entity_type),
    index("idx_config_change_audit_entity").on(t.iq_tenant_id, t.entity_id),
    index("idx_config_change_audit_time").on(t.iq_tenant_id, t.changed_at),
    index("idx_config_change_audit_actor").on(t.iq_tenant_id, t.changed_by),
    check(
      "chk_config_change_audit_entity_type",
      sql`${t.entity_type} IN ('tenant', 'organization', 'module_enablement', 'feature_flag', 'module_config', 'integration_profile')`,
    ),
    check(
      "chk_config_change_audit_action",
      sql`${t.action} IN ('created', 'updated', 'enabled', 'disabled', 'suspended', 'reactivated', 'decommissioned')`,
    ),
  ],
);
