/** JSON Schema fragments for EMPI patient routes (aligned with specs/openapi/empi.v1.yaml). */

export const uuidParam = {
  type: "string" as const,
  pattern:
    "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$",
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
const patientStatusEnum = ["active", "inactive", "deceased"] as const;
const addressTypeEnum = ["permanent", "current", "temporary"] as const;
const identifierTypeEnum = [
  "abha_address",
  "phr_address",
  "legacy_mrn",
  "insurance_id",
  "other",
] as const;

export const searchPatientsQuerySchema = {
  type: "object" as const,
  additionalProperties: false,
  properties: {
    name: { type: "string" },
    phone: { type: "string" },
    uhid: { type: "string" },
    abha_number: { type: "string" },
    status: { type: "string", enum: [...patientStatusEnum] },
    page: { type: "string", pattern: "^[1-9][0-9]*$" },
    limit: { type: "string", pattern: "^[1-9][0-9]*$" },
  },
};

export const findPatientByAbhaQuerySchema = {
  type: "object" as const,
  required: ["abha_address"],
  additionalProperties: false,
  properties: {
    abha_address: { type: "string", minLength: 1 },
  },
};

export const findPatientByDemographicsBodySchema = {
  type: "object" as const,
  required: ["identifiers"],
  additionalProperties: false,
  properties: {
    identifiers: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        required: ["type", "value"],
        additionalProperties: false,
        properties: {
          type: { type: "string", minLength: 1 },
          value: { type: "string", minLength: 1 },
        },
      },
    },
  },
};

export const paramsPatientIdSchema = {
  type: "object" as const,
  required: ["id"],
  additionalProperties: false,
  properties: {
    id: uuidParam,
  },
};

export const paramsPatientAndIdentifierSchema = {
  type: "object" as const,
  required: ["id", "identifierId"],
  additionalProperties: false,
  properties: {
    id: uuidParam,
    identifierId: uuidParam,
  },
};

export const paramsPatientAndAddressSchema = {
  type: "object" as const,
  required: ["id", "addressId"],
  additionalProperties: false,
  properties: {
    id: uuidParam,
    addressId: uuidParam,
  },
};

export const createPatientBodySchema = {
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
    registered_by: uuidParam,
    created_by: uuidParam,
    force_create: { type: "boolean" },
  },
};

export const updatePatientBodySchema = {
  type: "object" as const,
  minProperties: 1,
  additionalProperties: false,
  properties: {
    salutation: { type: "string", enum: [...salutationEnum] },
    first_name: { type: "string", minLength: 1 },
    middle_name: { type: "string" },
    last_name: { type: "string" },
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
    updated_by: uuidParam,
  },
};

export const changePatientStatusBodySchema = {
  type: "object" as const,
  required: ["status"],
  additionalProperties: false,
  properties: {
    status: { type: "string", enum: [...patientStatusEnum] },
  },
};

export const createIdentifierBodySchema = {
  type: "object" as const,
  required: ["identifier_type", "identifier_value"],
  additionalProperties: false,
  properties: {
    identifier_type: { type: "string", enum: [...identifierTypeEnum] },
    identifier_value: { type: "string", minLength: 1 },
    issuing_system: { type: "string" },
    source_record_id: uuidParam,
    created_by: uuidParam,
  },
};

export const createAddressBodySchema = {
  type: "object" as const,
  required: ["address_type"],
  additionalProperties: false,
  properties: {
    address_type: { type: "string", enum: [...addressTypeEnum] },
    street: { type: "string" },
    city: { type: "string" },
    district: { type: "string" },
    state: { type: "string" },
    pincode: { type: "string" },
    created_by: uuidParam,
  },
};

export const updateAddressBodySchema = {
  type: "object" as const,
  minProperties: 1,
  additionalProperties: false,
  properties: {
    address_type: { type: "string", enum: [...addressTypeEnum] },
    street: { type: "string" },
    city: { type: "string" },
    district: { type: "string" },
    state: { type: "string" },
    pincode: { type: "string" },
    updated_by: uuidParam,
  },
};
