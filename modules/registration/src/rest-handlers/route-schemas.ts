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

const salutationEnum = ["Mr", "Mrs", "Ms", "Dr", "Master", "Baby"] as const;
const genderEnum = ["male", "female", "other"] as const;
const bloodGroupEnum = [
  "A+",
  "A-",
  "B+",
  "B-",
  "AB+",
  "AB-",
  "O+",
  "O-",
] as const;

export const listRegistrationsQuerySchema = {
  type: "object" as const,
  additionalProperties: false,
  properties: {
    page: { type: "string", pattern: "^[1-9][0-9]*$" },
    limit: { type: "string", pattern: "^[1-9][0-9]*$" },
    uhid: { type: "string" },
    mobile: { type: "string" },
    name: { type: "string" },
  },
};

const demographicsSchema = {
  type: "object" as const,
  required: ["first_name", "gender", "phone_number"],
  additionalProperties: false,
  properties: {
    first_name: { type: "string", minLength: 1 },
    middle_name: { type: "string" },
    last_name: { type: "string" },
    salutation: { type: "string", enum: [...salutationEnum] },
    father_name: { type: "string" },
    mother_name: { type: "string" },
    date_of_birth: { type: "string" },
    year_of_birth: { type: "integer" },
    age_years: { type: "integer" },
    age_months: { type: "integer" },
    age_days: { type: "integer" },
    gender: { type: "string", enum: [...genderEnum] },
    phone_number: { type: "string", minLength: 1 },
    alternate_phone: { type: "string" },
    blood_group: { type: "string", enum: [...bloodGroupEnum] },
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

export const createRegistrationBodySchema = {
  type: "object" as const,
  required: ["patient_id"],
  additionalProperties: false,
  properties: {
    patient_id: uuidParam,
    visit_id: nullableUuid,
    facility_id: nullableUuid,
    visit_type: { type: "string" },
    department_id: nullableUuid,
    provider_id: nullableUuid,
    appointment_id: nullableUuid,
    registration_status: { type: "string" },
  },
} as const;

export const newPatientIntakeBodySchema = {
  type: "object" as const,
  required: ["patient"],
  additionalProperties: false,
  properties: {
    patient: demographicsSchema,
    visit_id: nullableUuid,
    facility_id: nullableUuid,
    visit_type: { type: "string" },
    department_id: nullableUuid,
    provider_id: nullableUuid,
    appointment_id: nullableUuid,
    registration_status: { type: "string" },
    created_by: nullableUuid,
  },
} as const;
