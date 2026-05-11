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
    slug: { type: "string", minLength: 1 },
    type: organizationTypeSchema,
    status: organizationStatusSchema,
    contact_email: { type: "string" },
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
    slug: { type: "string", minLength: 1 },
    type: organizationTypeSchema,
    status: organizationStatusSchema,
    contact_email: { anyOf: [{ type: "string" }, { type: "null" }] },
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
  },
} as const;
