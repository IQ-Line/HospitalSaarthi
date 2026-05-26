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
    source_origin: {
      type: "string",
      enum: ["platform_module", "legacy_system", "external_abdm"],
    },
    source_system_id: { type: "string" },
    source_record_type: {
      type: "string",
      enum: [
        "opd_visit",
        "ipd_admission",
        "lab_report",
        "prescription",
        "radiology_report",
        "discharge_summary",
        "immunisation_record",
        "wellness_record",
        "health_document",
        "external_record",
      ],
    },
    source_record_id: { type: "string" },
    encounter_id: { type: "string", format: "uuid" },
    display: { type: "string" },
    period_start: { type: "string", format: "date-time" },
    period_end: { type: "string", format: "date-time" },
    sensitivity_labels: {
      type: "array",
      items: { type: "string" },
    },
  },
} as const;

export const listCareContextsQuerySchema = {
  type: "object",
  required: ["patient_id"],
  properties: {
    patient_id: { type: "string", format: "uuid" },
    linked: { type: "string", enum: ["true", "false"] },
    status: {
      type: "string",
      enum: ["draft", "final", "superseded", "cancelled", "archived"],
    },
    source_origin: {
      type: "string",
      enum: ["platform_module", "legacy_system", "external_abdm"],
    },
    source_record_type: {
      type: "string",
      enum: [
        "opd_visit",
        "ipd_admission",
        "lab_report",
        "prescription",
        "radiology_report",
        "discharge_summary",
        "immunisation_record",
        "wellness_record",
        "health_document",
        "external_record",
      ],
    },
    abha_linkage_status: {
      type: "string",
      enum: ["not_linked", "linkable", "linked", "revoked"],
    },
  },
} as const;

export const discoverableQuerySchema = {
  type: "object",
  required: ["patient_id"],
  properties: {
    patient_id: { type: "string", format: "uuid" },
  },
} as const;

export const updateLinkageBodySchema = {
  type: "object",
  required: ["abha_linkage_status"],
  additionalProperties: false,
  properties: {
    abha_linkage_status: {
      type: "string",
      enum: ["not_linked", "linkable", "linked", "revoked"],
    },
    abdm_reference_number: { type: "string" },
    linked_at: { type: "string", format: "date-time" },
  },
} as const;

export const bulkUpdateLinkageBodySchema = {
  type: "object",
  required: ["updates"],
  additionalProperties: false,
  properties: {
    updates: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        required: ["care_context_id", "abdm_reference_number"],
        properties: {
          care_context_id: { type: "string", format: "uuid" },
          abdm_reference_number: { type: "string" },
          linked_at: { type: "string", format: "date-time" },
        },
      },
    },
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
    bundle_kind: {
      type: "string",
      enum: [
        "OpConsultRecord",
        "Prescription",
        "DischargeSummary",
        "DiagnosticReport",
        "HealthDocumentRecord",
        "ImmunizationRecord",
        "WellnessRecord",
      ],
    },
    fhir_profile_url: { type: "string", format: "uri" },
    fhir_profile_version: { type: "string" },
    producer_kind: {
      type: "string",
      enum: ["platform_module", "external_hip"],
    },
    producer_id: { type: "string" },
    bundle_json: { type: "object" },
    produced_at: { type: "string", format: "date-time" },
    received_at: { type: "string", format: "date-time" },
  },
} as const;

export const disclosureBodySchema = {
  type: "object",
  required: ["consent_artifact_id", "patient_id", "hi_types", "date_range"],
  additionalProperties: false,
  properties: {
    consent_artifact_id: { type: "string", format: "uuid" },
    patient_id: { type: "string", format: "uuid" },
    hi_types: {
      type: "array",
      items: { type: "string" },
    },
    date_range: {
      type: "object",
      required: ["from", "to"],
      properties: {
        from: { type: "string", format: "date-time" },
        to: { type: "string", format: "date-time" },
      },
    },
    care_context_ids: {
      type: "array",
      items: { type: "string", format: "uuid" },
    },
  },
} as const;

export const ingestExternalRecordBodySchema = {
  type: "object",
  required: [
    "patient_id",
    "consent_artifact_id",
    "bundle_json",
    "source_hip_id",
    "data_erase_at",
    "bundle_kind",
    "fhir_profile_url",
    "fhir_profile_version",
    "produced_at",
  ],
  additionalProperties: false,
  properties: {
    patient_id: { type: "string", format: "uuid" },
    consent_artifact_id: { type: "string", format: "uuid" },
    bundle_json: { type: "object" },
    source_hip_id: { type: "string" },
    source_hip_display_name: { type: "string" },
    data_erase_at: { type: "string", format: "date-time" },
    bundle_kind: {
      type: "string",
      enum: [
        "OpConsultRecord",
        "Prescription",
        "DischargeSummary",
        "DiagnosticReport",
        "HealthDocumentRecord",
        "ImmunizationRecord",
        "WellnessRecord",
      ],
    },
    fhir_profile_url: { type: "string", format: "uri" },
    fhir_profile_version: { type: "string" },
    produced_at: { type: "string", format: "date-time" },
  },
} as const;

export const listExternalRecordsQuerySchema = {
  type: "object",
  required: ["patient_id"],
  properties: {
    patient_id: { type: "string", format: "uuid" },
  },
} as const;

export const timelineQuerySchema = {
  type: "object",
  required: ["patient_id"],
  properties: {
    patient_id: { type: "string", format: "uuid" },
    limit: { type: "string", pattern: "^[0-9]+$" },
    before: { type: "string", format: "date-time" },
  },
} as const;

export const adminRebuildQuerySchema = {
  type: "object",
  required: ["patient_id"],
  properties: {
    patient_id: { type: "string", format: "uuid" },
  },
} as const;

export const erasureRunBodySchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    dry_run: { type: "boolean", default: true },
    as_of: { type: "string", format: "date-time" },
    scope: {
      type: "string",
      enum: ["all", "external_records_only", "internal_only"],
      default: "all",
    },
    patient_id: { type: "string", format: "uuid" },
  },
} as const;
