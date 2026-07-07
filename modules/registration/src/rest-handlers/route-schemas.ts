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

export const paramsVisitIdSchema = {
  type: "object" as const,
  required: ["visitId"],
  additionalProperties: false,
  properties: {
    visitId: uuidParam,
  },
};

const visitStatusEnum = ["pending", "in_progress", "completed", "cancelled"] as const;
const intakeCompletionEnum = ["pending", "partial", "complete"] as const;

export const dashboardStatsQuerySchema = {
  type: "object" as const,
  additionalProperties: false,
  properties: {
    days: { type: "string", pattern: "^[1-9][0-9]*$" },
  },
};

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
    abha_number: { type: "string" },
    abha_address: { type: "string" },
    patient_id: uuidParam,
  },
};

const isoDateParam = { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" } as const;

export const listVisitsQuerySchema = {
  type: "object" as const,
  additionalProperties: false,
  properties: {
    page: { type: "string", pattern: "^[1-9][0-9]*$" },
    limit: { type: "string", pattern: "^[1-9][0-9]*$" },
    status: { type: "string", enum: [...visitStatusEnum] },
    patient_id: uuidParam,
    facility_id: uuidParam,
    department_id: uuidParam,
    doctor_id: uuidParam,
    updated_from: isoDateParam,
    updated_to: isoDateParam,
  },
};

const visitRegistrationAddressSchema = {
  type: "object" as const,
  additionalProperties: false,
  properties: {
    line1: { type: "string" },
    line2: { type: "string" },
    city: { type: "string" },
    state: { type: "string" },
    district: { type: "string" },
    pincode: { type: "string" },
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
    abha_address: { type: "string" },
    force_create: { type: "boolean" },
  },
} as const;

const nullableUuid = {
  anyOf: [uuidParam, { type: "null" as const }],
} as const;

const consultationTypeEnum = ["new", "followup", "free-followup"] as const;

const visitEncounterFields = {
  facility_id: nullableUuid,
  visit_type: { type: "string" },
  consultation_type: { type: "string", enum: [...consultationTypeEnum] },
  department_id: nullableUuid,
  doctor_id: nullableUuid,
  appointment_id: nullableUuid,
  intake_completion: { type: "string", enum: [...intakeCompletionEnum] },
} as const;

export const visitTypeDecisionBodySchema = {
  type: "object" as const,
  required: ["department_id"],
  additionalProperties: false,
  properties: {
    department_id: uuidParam,
    patient: {
      type: "object" as const,
      additionalProperties: false,
      properties: {
        patient_id: uuidParam,
        uhid: { type: "string" },
        abha_number: { type: "string" },
        abha_address: { type: "string" },
        phone_number: { type: "string" },
        first_name: { type: "string" },
        middle_name: { type: "string" },
        last_name: { type: "string" },
        gender: { type: "string", enum: ["male", "female", "other"] },
        date_of_birth: { type: "string" },
        age_years: { type: "integer" },
        age_months: { type: "integer" },
        age_days: { type: "integer" },
      },
    },
  },
} as const;

const existingPatientDemographicsOverlay = {
  type: "object" as const,
  additionalProperties: false,
  properties: {
    abha_number: { type: "string" },
    abha_address: { type: "string" },
    date_of_birth: { type: "string" },
    year_of_birth: { type: "integer" },
  },
} as const;

export const existingPatientVisitBodySchema = {
  type: "object" as const,
  required: ["patient_id"],
  additionalProperties: false,
  properties: {
    patient_id: uuidParam,
    abha_number: { type: "string" },
    abha_address: { type: "string" },
    patient: existingPatientDemographicsOverlay,
    permanent_address: visitRegistrationAddressSchema,
    ...visitEncounterFields,
  },
} as const;

export const newPatientIntakeBodySchema = {
  type: "object" as const,
  required: ["patient"],
  additionalProperties: false,
  properties: {
    patient: demographicsSchema,
    permanent_address: visitRegistrationAddressSchema,
    ...visitEncounterFields,
  },
} as const;

const billingFeeLineSchema = {
  type: "object" as const,
  additionalProperties: false,
  properties: {
    item_code: { type: "string" },
    line_discount_percentage: { type: "number", minimum: 0, maximum: 100 },
  },
} as const;

const opdRegistrationBillingSchema = {
  type: "object" as const,
  additionalProperties: false,
  properties: {
    registration_fee: billingFeeLineSchema,
    consultation_fee: billingFeeLineSchema,
    department_name: { type: "string" },
    invoice_discount: { type: "number", minimum: 0 },
    amount_paid: { type: "number", minimum: 0 },
    payment_method: {
      type: "string",
      enum: ["CASH", "CARD", "UPI", "CHEQUE", "BANK_TRANSFER"],
    },
    payment_notes: { type: "string" },
  },
} as const;

export const opdRegistrationCompleteBodySchema = {
  type: "object" as const,
  required: ["patient"],
  additionalProperties: false,
  properties: {
    patient: demographicsSchema,
    permanent_address: visitRegistrationAddressSchema,
    billing: opdRegistrationBillingSchema,
    ...visitEncounterFields,
  },
} as const;

export const createVisitBodySchema = {
  type: "object" as const,
  required: ["patient_id"],
  additionalProperties: false,
  properties: {
    patient_id: uuidParam,
    ...visitEncounterFields,
  },
} as const;

export const patchVisitBodySchema = {
  type: "object" as const,
  additionalProperties: false,
  properties: {
    visit_type: { type: "string" },
    facility_id: nullableUuid,
    department_id: nullableUuid,
    doctor_id: nullableUuid,
    appointment_id: nullableUuid,
  },
} as const;

export const updateVisitStatusBodySchema = {
  type: "object" as const,
  required: ["status"],
  additionalProperties: false,
  properties: {
    status: { type: "string", enum: [...visitStatusEnum] },
  },
} as const;
