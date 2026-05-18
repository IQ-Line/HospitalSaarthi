/** JSON Schema fragments aligned with specs/openapi/registration.v1.yaml */

export const uuidParam = {
  type: "string" as const,
  pattern:
    "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$",
};

export const paramsRegistrationIdSchema = {
  type: "object" as const,
  required: ["registrationId"],
  additionalProperties: false,
  properties: {
    registrationId: uuidParam,
  },
};

const registrationStatusEnum = ["pending", "in_progress", "completed"] as const;

const intakeCompletionEnum = ["pending", "partial", "complete"] as const;

export const listRegistrationsQuerySchema = {
  type: "object" as const,
  additionalProperties: false,
  properties: {
    page: { type: "string", pattern: "^[1-9][0-9]*$" },
    limit: { type: "string", pattern: "^[1-9][0-9]*$" },
    q: { type: "string" },
    uhid: { type: "string" },
    mobile: { type: "string" },
    name: { type: "string" },
    status: { type: "string", enum: [...registrationStatusEnum] },
    patient_id: uuidParam,
    facility_id: uuidParam,
    department_id: uuidParam,
    provider_id: uuidParam,
  },
};

const patientSnapshotSchema = {
  type: "object" as const,
  required: ["uhid", "full_name", "phone_number"],
  additionalProperties: false,
  properties: {
    uhid: { type: "string", minLength: 1 },
    abha_number: { type: "string" },
    abha_address: { type: "string" },
    full_name: { type: "string", minLength: 1 },
    phone_number: { type: "string", minLength: 1 },
    gender: { type: "string" },
    date_of_birth: { type: "string" },
    year_of_birth: { type: "integer" },
  },
} as const;

const demographicsSchema = {
  type: "object" as const,
  required: ["first_name", "gender", "phone_number"],
  additionalProperties: false,
  properties: {
    first_name: { type: "string", minLength: 1 },
    middle_name: { type: "string" },
    last_name: { type: "string" },
    salutation: { type: "string" },
    father_name: { type: "string" },
    mother_name: { type: "string" },
    date_of_birth: { type: "string" },
    year_of_birth: { type: "integer" },
    age_years: { type: "integer" },
    age_months: { type: "integer" },
    age_days: { type: "integer" },
    gender: { type: "string", enum: ["male", "female", "other"] },
    phone_number: { type: "string", minLength: 1 },
    alternate_phone: { type: "string" },
    blood_group: { type: "string" },
    occupation: { type: "string" },
    nationality: { type: "string" },
    education: { type: "string" },
    emergency_contact_name: { type: "string" },
    emergency_contact_relationship: { type: "string" },
    emergency_contact_phone: { type: "string" },
    abha_number: { type: "string" },
    force_create: { type: "boolean" },
  },
} as const;

const nullableUuid = {
  anyOf: [uuidParam, { type: "null" as const }],
} as const;

export const existingPatientRegistrationBodySchema = {
  type: "object" as const,
  required: ["patient_id", "patient_source_record_id", "patient_snapshot"],
  additionalProperties: false,
  properties: {
    patient_id: uuidParam,
    patient_source_record_id: uuidParam,
    patient_snapshot: patientSnapshotSchema,
    facility_id: nullableUuid,
    visit_type: { type: "string" },
    department_id: nullableUuid,
    provider_id: nullableUuid,
    appointment_id: nullableUuid,
    intake_completion: { type: "string", enum: [...intakeCompletionEnum] },
  },
} as const;

export const newPatientIntakeBodySchema = {
  type: "object" as const,
  required: ["patient"],
  additionalProperties: false,
  properties: {
    patient: demographicsSchema,
    facility_id: nullableUuid,
    visit_type: { type: "string" },
    department_id: nullableUuid,
    provider_id: nullableUuid,
    appointment_id: nullableUuid,
    intake_completion: { type: "string", enum: [...intakeCompletionEnum] },
  },
} as const;
