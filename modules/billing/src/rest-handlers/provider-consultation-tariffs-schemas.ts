const uuid = { type: "string", format: "uuid" } as const;
const money = { type: ["string", "number"] } as const;
const tag = { tags: ["billing"] } as const;

export const bulkUpsertProviderConsultationTariffsRouteSchema = {
  ...tag,
  summary: "Bulk upsert provider consultation tariffs by department and type",
  body: {
    type: "object",
    required: ["provider_id", "items"],
    additionalProperties: false,
    properties: {
      provider_id: uuid,
      items: {
        type: "array",
        minItems: 1,
        items: {
          type: "object",
          required: ["department_id", "consultation_type_id", "base_price"],
          additionalProperties: false,
          properties: {
            department_id: uuid,
            consultation_type_id: uuid,
            base_price: money,
            tax_percentage: money,
          },
        },
      },
    },
  },
} as const;

export const listConsultationTypesRouteSchema = {
  ...tag,
  summary: "List consultation types (GENERAL_CONSULTATION, etc.)",
} as const;

export const listProviderConsultationTariffsRouteSchema = {
  ...tag,
  summary: "List provider consultation tariffs",
  querystring: {
    type: "object",
    additionalProperties: false,
    properties: {
      provider_id: uuid,
      department_id: uuid,
      consultation_type_id: uuid,
    },
  },
} as const;
