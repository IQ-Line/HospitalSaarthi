/** AJV JSON Schema fragments for M3 platform routes. */

export const m3PurposeCodes = [
  "CAREMGT",
  "BTG",
  "PUBHLTH",
  "HPAYMT",
  "DSRCH",
  "PATRQT",
] as const;

export const startConsentRequestBodySchema = {
  type: "object" as const,
  required: ["patientAbhaAddress", "purpose", "hiTypes", "dateRange"],
  additionalProperties: false,
  properties: {
    patientAbhaAddress: { type: "string", minLength: 1 },
    hipId: { type: "string", minLength: 1 },
    purpose: { type: "string", enum: [...m3PurposeCodes] },
    hiTypes: {
      type: "array",
      minItems: 1,
      items: { type: "string", minLength: 1 },
    },
    dateRange: {
      type: "object",
      required: ["from", "to"],
      additionalProperties: false,
      properties: {
        from: { type: "string", minLength: 1 },
        to: { type: "string", minLength: 1 },
      },
    },
    dataEraseAt: { type: "string", minLength: 1 },
    requesterName: { type: "string", minLength: 1 },
    requesterRegNo: { type: "string" },
  },
};

export const startDataRequestBodySchema = {
  type: "object" as const,
  required: ["consentId"],
  additionalProperties: false,
  properties: {
    consentId: { type: "string", minLength: 1 },
  },
};

export const m3SessionIdParamSchema = {
  type: "object" as const,
  required: ["sessionId"],
  additionalProperties: false,
  properties: {
    sessionId: {
      type: "string",
      pattern:
        "^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$",
    },
  },
};

export const m3TransferIdParamSchema = {
  type: "object" as const,
  required: ["transferId"],
  additionalProperties: false,
  properties: {
    transferId: {
      type: "string",
      pattern:
        "^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$",
    },
  },
};
