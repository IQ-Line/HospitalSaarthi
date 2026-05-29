/** Fastify JSON schemas aligned with `specs/openapi/configurator.v1.yaml` */

export const organizationTypeSchema = {
  type: "string",
  enum: ["hospital_chain", "medical_college", "standalone_hospital", "government_network"],
} as const;

export const organizationStatusSchema = {
  type: "string",
  enum: ["active", "suspended", "decommissioned"],
} as const;

export const tenantTypeSchema = {
  type: "string",
  enum: ["full_platform", "fragmented", "lite"],
} as const;

export const provisioningStatusSchema = {
  type: "string",
  enum: ["provisioning", "active", "suspended", "decommissioned"],
} as const;

export const dataIsolationLevelSchema = {
  type: "string",
  enum: ["shared", "isolated"],
} as const;

export const branchTypeSchema = {
  type: "string",
  enum: ["hub_lab", "hub", "satellite"],
} as const;

/** UUID string (avoids requiring ajv-formats for `format: uuid`). */
const uuidString = {
  type: "string",
  minLength: 36,
  maxLength: 36,
  pattern:
    "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$",
} as const;

export const uuidParamSchema = {
  type: "object",
  required: ["id"],
  properties: {
    id: uuidString,
  },
} as const;

export const postOrganizationBodySchema = {
  type: "object",
  required: ["name", "slug", "type"],
  additionalProperties: false,
  properties: {
    name: { type: "string", minLength: 1 },
    slug: { type: "string", minLength: 3 },
    type: organizationTypeSchema,
    status: organizationStatusSchema,
    contact_email: { anyOf: [{ type: "string", format: "email" }, { type: "null" }] },
    website: { anyOf: [{ type: "string" }, { type: "null" }] },
    contact_phone: { type: "string" },
    address: { type: "string" },
    metadata: { type: "object" },
  },
} as const;

export const patchOrganizationBodySchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    name: { type: "string", minLength: 1 },
    slug: { type: "string", minLength: 3 },
    type: organizationTypeSchema,
    status: organizationStatusSchema,
    contact_email: { anyOf: [{ type: "string", format: "email" }, { type: "null" }] },
    website: { anyOf: [{ type: "string" }, { type: "null" }] },
    contact_phone: { anyOf: [{ type: "string" }, { type: "null" }] },
    address: { anyOf: [{ type: "string" }, { type: "null" }] },
    metadata: { anyOf: [{ type: "object" }, { type: "null" }] },
  },
} as const;

export const postTenantBodySchema = {
  type: "object",
  required: ["org_id", "name", "slug", "type", "cerbos_scope_key"],
  additionalProperties: false,
  properties: {
    org_id: uuidString,
    parent_tenant_id: { anyOf: [uuidString, { type: "null" }] },
    name: { type: "string", minLength: 1 },
    slug: { type: "string", minLength: 1 },
    type: tenantTypeSchema,
    provisioning_status: provisioningStatusSchema,
    data_isolation_level: dataIsolationLevelSchema,
    cerbos_scope_key: { type: "string", minLength: 1 },
    timezone: { type: "string" },
    locale: { type: "string" },
    metadata: { anyOf: [{ type: "object" }, { type: "null" }] },
    branch_code: { type: "string", minLength: 2, maxLength: 10 },
    branch_type: branchTypeSchema,
    address_line1: { type: "string" },
    city: { type: "string" },
    state: { type: "string" },
    pin_code: { type: "string" },
    contact_phone: { type: "string" },
    contact_email: { type: "string" },
  },
} as const;

export const patchTenantBodySchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    org_id: uuidString,
    parent_tenant_id: { anyOf: [uuidString, { type: "null" }] },
    name: { type: "string", minLength: 1 },
    slug: { type: "string", minLength: 1 },
    type: tenantTypeSchema,
    provisioning_status: provisioningStatusSchema,
    data_isolation_level: dataIsolationLevelSchema,
    cerbos_scope_key: { type: "string", minLength: 1 },
    timezone: { type: "string" },
    locale: { type: "string" },
    metadata: { anyOf: [{ type: "object" }, { type: "null" }] },
    branch_type: branchTypeSchema,
    address_line1: { type: "string" },
    city: { type: "string" },
    state: { type: "string" },
    pin_code: { type: "string" },
    contact_phone: { type: "string" },
    contact_email: { type: "string" },
  },
} as const;

export const tenantModuleParamsSchema = {
  type: "object",
  required: ["tenantId", "moduleId"],
  properties: {
    tenantId: uuidString,
    moduleId: uuidString,
  },
} as const;

export const postTenantModuleBodySchema = {
  type: "object",
  required: ["module_id"],
  additionalProperties: false,
  properties: {
    module_id: uuidString,
    is_active: { type: "boolean" },
    is_core_override: { type: "boolean" },
    created_by: { anyOf: [uuidString, { type: "null" }] },
  },
} as const;

export const patchTenantModuleBodySchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    is_active: { type: "boolean" },
    is_core_override: { type: "boolean" },
    updated_by: { anyOf: [uuidString, { type: "null" }] },
  },
} as const;

export const integrationKindSchema = {
  type: "string",
  enum: ["abdm"],
} as const;

export const gatewayEnvironmentSchema = {
  type: "string",
  enum: ["sandbox", "production"],
} as const;

export const tenantIntegrationProfileParamsSchema = {
  type: "object",
  required: ["tenantId", "profileId"],
  properties: {
    tenantId: uuidString,
    profileId: uuidString,
  },
} as const;

export const postTenantIntegrationProfileBodySchema = {
  type: "object",
  required: ["integration_kind", "hip_id", "hiu_id"],
  additionalProperties: false,
  properties: {
    integration_kind: integrationKindSchema,
    is_active: { type: "boolean" },
    hip_id: { type: "string", minLength: 1 },
    hiu_id: { type: "string", minLength: 1 },
    cm_id: { type: "string" },
    client_id: { anyOf: [{ type: "string" }, { type: "null" }] },
    client_secret: { anyOf: [{ type: "string" }, { type: "null" }] },
    default_sms_phone: { anyOf: [{ type: "string" }, { type: "null" }] },
    hip_display_name: { anyOf: [{ type: "string" }, { type: "null" }] },
    callback_base_url: { anyOf: [{ type: "string" }, { type: "null" }] },
    sms_provider: { anyOf: [{ type: "string" }, { type: "null" }] },
    sms_config: { type: "object" },
    gateway_environment: gatewayEnvironmentSchema,
    created_by: { anyOf: [uuidString, { type: "null" }] },
  },
} as const;

export const patchTenantIntegrationProfileBodySchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    is_active: { type: "boolean" },
    hip_id: { type: "string", minLength: 1 },
    hiu_id: { type: "string", minLength: 1 },
    cm_id: { type: "string" },
    client_id: { anyOf: [{ type: "string" }, { type: "null" }] },
    client_secret: { anyOf: [{ type: "string" }, { type: "null" }] },
    default_sms_phone: { anyOf: [{ type: "string" }, { type: "null" }] },
    hip_display_name: { anyOf: [{ type: "string" }, { type: "null" }] },
    callback_base_url: { anyOf: [{ type: "string" }, { type: "null" }] },
    sms_provider: { anyOf: [{ type: "string" }, { type: "null" }] },
    sms_config: { type: "object" },
    gateway_environment: gatewayEnvironmentSchema,
    updated_by: { anyOf: [uuidString, { type: "null" }] },
  },
} as const;
