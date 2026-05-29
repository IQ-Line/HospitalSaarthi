/** Fastify JSON schemas for sequence configuration routes. */

const uuidString = {
  type: "string",
  minLength: 36,
  maxLength: 36,
  pattern:
    "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$",
} as const;

export const identifierTypeSchema = {
  type: "string",
  enum: [
    "patient_uhid",
    "op_visit",
    "ip_visit",
    "emergency_visit",
    "op_bill",
    "ip_bill",
    "emergency_bill",
  ],
} as const;

export const segmentTypeSchema = {
  type: "string",
  enum: ["date_format", "sequence", "tenant_code", "prefix_text"],
} as const;

export const dateFormatSchema = {
  type: "string",
  enum: ["YYMMDD", "YYYYMMDD", "MMDDYY", "DDMMYY"],
} as const;

export const sequenceFormatSegmentSchema = {
  type: "object",
  required: ["segment_type", "enabled", "order_index"],
  additionalProperties: false,
  properties: {
    segment_type: segmentTypeSchema,
    enabled: { type: "boolean" },
    order_index: { type: "integer", minimum: 0 },
    date_format: dateFormatSchema,
    sequence_digits: { type: "integer", minimum: 1, maximum: 12 },
    sequence_starts_at: { type: "integer", minimum: 1 },
    prefix_value: { anyOf: [{ type: "string" }, { type: "null" }] },
  },
} as const;

export const sequenceIdentifierUpsertBodySchema = {
  type: "object",
  required: ["is_custom"],
  additionalProperties: false,
  properties: {
    is_custom: { type: "boolean" },
    segments: {
      type: "array",
      minItems: 1,
      items: sequenceFormatSegmentSchema,
    },
  },
  allOf: [
    {
      if: {
        properties: { is_custom: { const: true } },
        required: ["is_custom"],
      },
      then: {
        required: ["is_custom", "segments"],
      },
    },
    {
      if: {
        properties: { is_custom: { const: false } },
        required: ["is_custom"],
      },
      then: {
        not: { required: ["segments"] },
      },
    },
  ],
} as const;

export const tenantIdParamSchema = {
  type: "object",
  required: ["tenantId"],
  properties: {
    tenantId: uuidString,
  },
} as const;

export const tenantIdentifierParamsSchema = {
  type: "object",
  required: ["tenantId", "identifierType"],
  properties: {
    tenantId: uuidString,
    identifierType: identifierTypeSchema,
  },
} as const;

export const sequenceConfigStatusSchema = {
  type: "string",
  enum: ["default", "configured"],
} as const;

export const provisioningStatusQuerySchema = {
  type: "string",
  enum: ["provisioning", "active", "suspended", "decommissioned"],
} as const;

export const sequenceConfigurationListQuerySchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    org_id: uuidString,
    provisioning_status: provisioningStatusQuerySchema,
    status: sequenceConfigStatusSchema,
    q: { type: "string" },
  },
} as const;
