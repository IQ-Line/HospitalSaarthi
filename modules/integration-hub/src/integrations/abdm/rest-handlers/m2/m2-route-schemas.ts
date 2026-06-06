/** AJV JSON Schema fragments for M2 platform routes. */

const uuidPattern =
  "^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$";

export const m2GenderEnum = ["M", "F", "O", "D"] as const;

export const linkTokenAcquireBodySchema = {
  type: "object" as const,
  required: ["abhaAddress", "demographics"],
  additionalProperties: false,
  properties: {
    abhaAddress: { type: "string", minLength: 1 },
    abhaNumber: { type: "string", minLength: 1 },
    timeoutMs: { type: "integer", minimum: 0 },
    wait: { type: "boolean" },
    demographics: {
      type: "object",
      required: ["name", "gender", "yearOfBirth"],
      additionalProperties: false,
      properties: {
        name: { type: "string", minLength: 1 },
        gender: { type: "string", enum: [...m2GenderEnum] },
        yearOfBirth: { type: "integer", minimum: 1900, maximum: 2100 },
      },
    },
  },
};

export const linkTokenStatusQuerySchema = {
  type: "object" as const,
  additionalProperties: false,
  properties: {
    sessionId: { type: "string", pattern: uuidPattern },
    abhaAddress: { type: "string", minLength: 1 },
  },
};

export const m2SessionIdParamSchema = {
  type: "object" as const,
  required: ["sessionId"],
  additionalProperties: false,
  properties: {
    sessionId: { type: "string", pattern: uuidPattern },
  },
};

export const hipInitiatedLinkStartBodySchema = {
  type: "object" as const,
  required: ["abhaAddress", "patientName", "gender", "yearOfBirth", "careContexts"],
  additionalProperties: false,
  properties: {
    abhaAddress: { type: "string", minLength: 1 },
    abhaNumber: { type: "string", minLength: 1 },
    patientReference: { type: "string", minLength: 1 },
    patientName: { type: "string", minLength: 1 },
    gender: { type: "string", enum: [...m2GenderEnum] },
    yearOfBirth: { type: "integer", minimum: 1900, maximum: 2100 },
    phoneNo: { type: "string", minLength: 1 },
    careContexts: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        required: ["referenceNumber", "display", "hiType"],
        additionalProperties: false,
        properties: {
          referenceNumber: { type: "string", minLength: 1 },
          display: { type: "string", minLength: 1 },
          hiType: { type: "string", minLength: 1 },
        },
      },
    },
  },
};

export const addContextsPublishBodySchema = {
  type: "object" as const,
  required: ["abhaAddress", "patientReference", "careContextReference", "hiType"],
  additionalProperties: false,
  properties: {
    abhaAddress: { type: "string", minLength: 1 },
    patientReference: { type: "string", minLength: 1 },
    careContextReference: { type: "string", minLength: 1 },
    hiType: { type: "string", minLength: 1 },
    eventDate: { type: "string", minLength: 1 },
  },
};

export const orchestrateM2AfterCareContextsBodySchema = {
  type: "object" as const,
  required: ["patientId", "careContexts"],
  additionalProperties: false,
  properties: {
    patientId: { type: "string", minLength: 1 },
    eventDate: { type: "string", minLength: 1 },
    careContexts: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        required: ["referenceNumber", "display", "hiType"],
        additionalProperties: false,
        properties: {
          referenceNumber: { type: "string", minLength: 1 },
          display: { type: "string", minLength: 1 },
          hiType: { type: "string", minLength: 1 },
        },
      },
    },
  },
};

export const smsNotifyBodySchema = {
  type: "object" as const,
  required: ["phoneNo"],
  additionalProperties: false,
  properties: {
    phoneNo: { type: "string", minLength: 1 },
    hipName: { type: "string", minLength: 1 },
  },
};
