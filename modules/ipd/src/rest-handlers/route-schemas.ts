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

export const paramsClinicalNoteIdSchema = {
  type: "object" as const,
  required: ["admissionId", "noteId"],
  additionalProperties: false,
  properties: {
    admissionId: uuidParam,
    noteId: uuidParam,
  },
};

const clinicalNoteTypeEnum = [
  "admission_note",
  "progress_note",
  "procedure_note",
  "consultation_note",
  "discharge_summary_note",
  "operation_note",
  "transfer_note",
  "handover_note",
  "nursing_note",
] as const;

const authorRoleEnum = [
  "consultant",
  "resident",
  "registrar",
  "nurse",
  "specialist",
  "intern",
] as const;

const clinicalNoteContentSchema = {
  type: "object" as const,
  additionalProperties: false,
  properties: {
    structured: { type: "string" },
    narrative: { type: "string" },
    sections: {
      type: "object" as const,
      additionalProperties: { type: "string" },
    },
  },
};

export const createClinicalNoteBodySchema = {
  type: "object" as const,
  required: ["note_type", "author_role", "content"],
  additionalProperties: false,
  properties: {
    note_type: { type: "string", enum: [...clinicalNoteTypeEnum] },
    author_role: { type: "string", enum: [...authorRoleEnum] },
    author_specialty_code: { type: "string", nullable: true },
    content: clinicalNoteContentSchema,
  },
};

export const updateClinicalNoteBodySchema = {
  type: "object" as const,
  additionalProperties: false,
  properties: {
    note_type: { type: "string", enum: [...clinicalNoteTypeEnum] },
    author_role: { type: "string", enum: [...authorRoleEnum] },
    author_specialty_code: { type: "string", nullable: true },
    content: clinicalNoteContentSchema,
  },
};

export const listClinicalNotesQuerySchema = {
  type: "object" as const,
  additionalProperties: false,
  properties: {
    status: { type: "string", enum: ["draft", "finalized", "signed"] },
    note_type: { type: "string", enum: [...clinicalNoteTypeEnum] },
  },
};

const recorderRoleEnum = ["nurse", "doctor", "resident", "consultant"] as const;

export const recordVitalCheckInBodySchema = {
  type: "object" as const,
  required: ["recorder_role"],
  additionalProperties: false,
  properties: {
    recorded_at: { type: "string", format: "date-time" },
    recorder_role: { type: "string", enum: [...recorderRoleEnum] },
    notes: { type: "string", nullable: true },
    heart_rate: { type: "number", nullable: true },
    systolic_bp: { type: "number", nullable: true },
    diastolic_bp: { type: "number", nullable: true },
    temperature: { type: "number", nullable: true },
    spo2: { type: "number", nullable: true },
    respiratory_rate: { type: "number", nullable: true },
  },
};

export const listVitalCheckInsQuerySchema = {
  type: "object" as const,
  additionalProperties: false,
  properties: {
    recorder_role: { type: "string", enum: [...recorderRoleEnum] },
  },
};

const orderCategoryEnum = [
  "medication",
  "procedure",
  "laboratory",
  "radiology",
  "consumable",
] as const;

const orderPriorityEnum = ["routine", "urgent", "stat"] as const;

const orderStatusEnum = [
  "placed",
  "pending",
  "acknowledged",
  "in_progress",
  "completed",
  "cancelled",
  "on_hold",
] as const;

export const paramsOrderIdSchema = {
  type: "object" as const,
  required: ["admissionId", "orderId"],
  additionalProperties: false,
  properties: {
    admissionId: uuidParam,
    orderId: uuidParam,
  },
};

export const createInpatientOrderBodySchema = {
  type: "object" as const,
  required: ["order_category", "item_name"],
  additionalProperties: false,
  properties: {
    order_category: { type: "string", enum: [...orderCategoryEnum] },
    item_name: { type: "string", minLength: 1 },
    item_code: { type: "string", nullable: true },
    quantity: { type: "number", nullable: true },
    priority: { type: "string", enum: [...orderPriorityEnum] },
    dosage_instruction: { type: "string", nullable: true },
    frequency: { type: "string", nullable: true },
    duration_days: { type: "integer", nullable: true },
    description: { type: "string", nullable: true },
    special_instructions: { type: "string", nullable: true },
  },
};

export const listInpatientOrdersQuerySchema = {
  type: "object" as const,
  additionalProperties: false,
  properties: {
    page: { type: "string", pattern: "^[1-9][0-9]*$" },
    limit: { type: "string", pattern: "^[1-9][0-9]*$" },
    order_category: { type: "string", enum: [...orderCategoryEnum] },
    priority: { type: "string", enum: [...orderPriorityEnum] },
    status: { type: "string", enum: [...orderStatusEnum] },
    q: { type: "string" },
  },
};
