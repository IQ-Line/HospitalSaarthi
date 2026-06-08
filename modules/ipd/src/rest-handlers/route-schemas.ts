/** JSON Schema fragments aligned with specs/openapi/ipd.v1.yaml */

export const uuidParam = {
  type: "string" as const,
  pattern:
    "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$",
};

export const paramsAdmissionIdSchema = {
  type: "object" as const,
  required: ["admissionId"],
  additionalProperties: false,
  properties: {
    admissionId: uuidParam,
  },
};

export const createAdmissionBodySchema = {
  type: "object" as const,
  required: ["admission_source", "admission_type", "patient_id", "patient_name"],
  additionalProperties: false,
  properties: {
    admission_source: {
      type: "string",
      enum: ["opd", "emergency", "referral", "walk_in"],
    },
    admission_type: {
      type: "string",
      enum: ["planned", "emergency", "direct", "transfer_in", "daycare"],
    },
    patient_id: uuidParam,
    patient_name: { type: "string", minLength: 1 },
    visit_id: { type: "string", nullable: true },
    specialty_id: { type: "string", nullable: true },
    attending_consultant_id: { type: "string", nullable: true },
    provisional_diagnosis: { type: "string", nullable: true },
    financial_class: {
      type: "string",
      enum: ["general", "private", "insurance", "sponsored"],
    },
    deposit_amount: { type: "number", nullable: true },
    expected_los_days: { type: "integer", nullable: true },
    ward_id: { type: "string", nullable: true },
    bed_id: { type: "string", nullable: true },
  },
};

export const updateAdmissionBodySchema = {
  type: "object" as const,
  additionalProperties: false,
  properties: {
    specialty_id: { type: "string", nullable: true },
    attending_consultant_id: { type: "string", nullable: true },
    provisional_diagnosis: { type: "string", nullable: true },
    financial_class: {
      type: "string",
      enum: ["general", "private", "insurance", "sponsored"],
    },
    deposit_amount: { type: "number", nullable: true },
    expected_los_days: { type: "integer", nullable: true },
    ward_id: { type: "string", nullable: true },
    bed_id: { type: "string", nullable: true },
  },
};

export const listAdmissionsQuerySchema = {
  type: "object" as const,
  additionalProperties: false,
  properties: {
    page: { type: "string", pattern: "^[1-9][0-9]*$" },
    limit: { type: "string", pattern: "^[1-9][0-9]*$" },
    status: { type: "string" },
    admission_source: { type: "string" },
    admission_type: { type: "string" },
    ward_id: uuidParam,
    q: { type: "string" },
  },
};
