export const paramsIdSchema = {
  type: "object",
  required: ["id"],
  properties: {
    id: { type: "string", format: "uuid" },
  },
} as const;

export const createCareContextBodySchema = {
  type: "object",
  required: [
    "patient_id",
    "source_origin",
    "source_system_id",
    "source_record_type",
    "display",
    "period_start",
  ],
  additionalProperties: false,
  properties: {
    patient_id: { type: "string", format: "uuid" },
    source_origin: { type: "string" },
    source_system_id: { type: "string" },
    source_record_type: { type: "string" },
    source_record_id: { type: "string" },
    encounter_id: { type: "string", format: "uuid" },
    display: { type: "string" },
    period_start: { type: "string", format: "date-time" },
    period_end: { type: "string", format: "date-time" },
    status: { type: "string", enum: ["active", "inactive", "archived"] },
  },
} as const;

export const listCareContextsQuerySchema = {
  type: "object",
  properties: {
    patient_id: { type: "string", format: "uuid" },
    status: { type: "string", enum: ["active", "inactive", "archived"] },
    limit: { type: "integer", minimum: 1, maximum: 200 },
    offset: { type: "integer", minimum: 0 },
  },
} as const;

export const storeBundleBodySchema = {
  type: "object",
  required: [
    "care_context_id",
    "bundle_kind",
    "fhir_profile_url",
    "fhir_profile_version",
    "bundle_json",
    "produced_at",
  ],
  additionalProperties: false,
  properties: {
    care_context_id: { type: "string", format: "uuid" },
    bundle_kind: { type: "string" },
    fhir_profile_url: { type: "string", format: "uri" },
    fhir_profile_version: { type: "string" },
    producer_kind: { type: "string" },
    producer_id: { type: "string" },
    bundle_json: { type: "object" },
    produced_at: { type: "string", format: "date-time" },
  },
} as const;
