/** AJV JSON Schema fragments for M1 routes (aligned with specs/openapi/abdm-adapter.v1.yaml). */

export const uuidParam = {
  type: "string" as const,
  pattern:
    "^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$",
};

export const sessionIdParamSchema = {
  type: "object" as const,
  required: ["sessionId"],
  additionalProperties: false,
  properties: {
    sessionId: uuidParam,
  },
};

export const sessionIdQuerySchema = {
  type: "object" as const,
  required: ["sessionId"],
  additionalProperties: false,
  properties: {
    sessionId: uuidParam,
  },
};

export const aadhaar12BodySchema = {
  type: "object" as const,
  required: ["aadhaarNumber"],
  additionalProperties: false,
  properties: {
    aadhaarNumber: { type: "string", pattern: "^\\d{12}$" },
  },
};

export const mobile10BodySchema = {
  type: "object" as const,
  required: ["mobile"],
  additionalProperties: false,
  properties: {
    mobile: { type: "string", pattern: "^\\d{10}$" },
  },
};

export const otp6SessionBodySchema = {
  type: "object" as const,
  required: ["sessionId", "otp"],
  additionalProperties: false,
  properties: {
    sessionId: uuidParam,
    otp: { type: "string", pattern: "^\\d{6}$" },
  },
};

export const abhaNumberBodySchema = {
  type: "object" as const,
  required: ["abhaNumber"],
  additionalProperties: false,
  properties: {
    abhaNumber: { type: "string", minLength: 14 },
    channel: { type: "string", enum: ["aadhaar", "abha-otp"] },
  },
};

export const abhaAddressBodySchema = {
  type: "object" as const,
  required: ["abhaAddress"],
  additionalProperties: false,
  properties: {
    abhaAddress: { type: "string", minLength: 3 },
    channel: { type: "string", enum: ["mobile", "aadhaar"] },
  },
};

export const profileUpdateMobileOtpBodySchema = {
  type: "object" as const,
  required: ["sessionId", "mobile"],
  additionalProperties: false,
  properties: {
    sessionId: uuidParam,
    mobile: { type: "string", pattern: "^\\d{10}$" },
  },
};

export const aadhaarOtpResendBodySchema = {
  type: "object" as const,
  required: ["sessionId", "aadhaarNumber"],
  additionalProperties: false,
  properties: {
    sessionId: uuidParam,
    aadhaarNumber: { type: "string", pattern: "^\\d{12}$" },
  },
};

export const enrolAadhaarVerifyBodySchema = {
  type: "object" as const,
  required: ["sessionId", "otp"],
  additionalProperties: false,
  properties: {
    sessionId: uuidParam,
    otp: { type: "string", pattern: "^\\d{6}$" },
    mobile: { type: "string", pattern: "^\\d{10}$" },
  },
};

export const mobileVerifyOtpBodySchema = {
  type: "object" as const,
  required: ["sessionId", "mobile"],
  additionalProperties: false,
  properties: {
    sessionId: uuidParam,
    mobile: { type: "string", pattern: "^\\d{10}$" },
  },
};

export const abhaAddressCreateBodySchema = {
  type: "object" as const,
  required: ["sessionId", "abhaAddress"],
  additionalProperties: false,
  properties: {
    sessionId: uuidParam,
    abhaAddress: { type: "string", minLength: 3 },
    preferred: { type: ["number", "string"] },
  },
};

export const loginVerifyUserBodySchema = {
  type: "object" as const,
  required: ["sessionId", "abhaNumber"],
  additionalProperties: false,
  properties: {
    sessionId: uuidParam,
    abhaNumber: { type: "string", minLength: 14 },
  },
};

export const profileUpdateEmailOtpBodySchema = {
  type: "object" as const,
  required: ["sessionId", "email"],
  additionalProperties: false,
  properties: {
    sessionId: uuidParam,
    email: { type: "string", format: "email" },
  },
};
