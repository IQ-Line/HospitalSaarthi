export const uuidParam = {
  type: "string" as const,
  pattern:
    "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$",
};

const optionalUuid = {
  type: "string" as const,
  pattern:
    "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$",
};

/** Visit / encounter fields shared by create registration and intake workflows. */
const intakeVisitFields = {
  visit_id: optionalUuid,
  facility_id: optionalUuid,
  visit_type: { type: "string" },
  department_id: optionalUuid,
  provider_id: optionalUuid,
  appointment_id: optionalUuid,
  registration_status: { type: "string" },
  created_by: optionalUuid,
} as const;

/**
 * Patient payload for new-patient intake — aligned with EMPI `CreatePatientRequest`
 * (`specs/openapi/empi.v1.yaml`); persisted by EMPI, not the registration schema.
 */
const createPatientDemographicsSchema = {
  type: "object" as const,
  required: ["first_name", "gender", "phone_number"],
  additionalProperties: false,
  properties: {
    first_name: { type: "string" },
    middle_name: { type: "string" },
    last_name: { type: "string" },
    salutation: {
      type: "string",
      enum: ["Mr", "Mrs", "Ms", "Dr", "Master", "Baby"],
    },
    father_name: { type: "string" },
    mother_name: { type: "string" },
    date_of_birth: { type: "string" },
    year_of_birth: { type: "integer" },
    age_years: { type: "integer" },
    age_months: { type: "integer" },
    age_days: { type: "integer" },
    gender: { type: "string", enum: ["male", "female", "other"] },
    phone_number: { type: "string" },
    alternate_phone: { type: "string" },
    blood_group: {
      type: "string",
      enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
    },
    occupation: { type: "string" },
    nationality: { type: "string" },
    education: { type: "string" },
    emergency_contact_name: { type: "string" },
    emergency_contact_relationship: { type: "string" },
    emergency_contact_phone: { type: "string" },
    abha_number: { type: "string" },
    force_create: { type: "boolean" },
  },
};

export const createRegistrationBodySchema = {
  type: "object" as const,
  required: ["patient_id"],
  additionalProperties: false,
  properties: {
    patient_id: uuidParam,
    ...intakeVisitFields,
  },
};

export const newPatientIntakeBodySchema = {
  type: "object" as const,
  required: ["patient"],
  additionalProperties: false,
  properties: {
    patient: createPatientDemographicsSchema,
    ...intakeVisitFields,
  },
};

export const paramsRegistrationIdSchema = {
  type: "object" as const,
  required: ["registrationId"],
  additionalProperties: false,
  properties: {
    registrationId: uuidParam,
  },
};
