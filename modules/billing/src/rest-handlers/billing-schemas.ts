/** Fastify JSON schemas for Swagger (Phase 1 billing routes). */

const uuid = { type: "string", format: "uuid" } as const;
const money = { type: "number", minimum: 0 } as const;
const tag = { tags: ["billing"] } as const;

export const billIdParamsSchema = {
  type: "object",
  required: ["bill_id"],
  properties: { bill_id: uuid },
} as const;

const billIdRoute = { ...tag, params: billIdParamsSchema } as const;

export const captureChargeRouteSchema = {
  ...tag,
  summary: "Capture charge (registration / OPD)",
  body: {
    type: "object",
    required: ["patient_id", "source_module", "item_code"],
    additionalProperties: false,
    properties: {
      patient_id: uuid,
      visit_id: { ...uuid, nullable: true },
      visit_type: { type: "string", enum: ["OPD", "IPD", "ER", "DAYCARE", "WALK_IN"] },
      source_module: { type: "string" },
      source_ref: { ...uuid, nullable: true },
      item_code: { type: "string" },
      provider_id: { ...uuid, nullable: true },
      quantity: { ...money, default: 1 },
      unit_price_override: { ...money, nullable: true },
      tax_percentage_override: { ...money, nullable: true },
      line_discount_amount: { ...money, nullable: true },
      performed_by: { ...uuid, nullable: true },
      performed_date: { type: "string", format: "date-time", nullable: true },
      department: { type: "string", nullable: true },
      notes: { type: "string", nullable: true },
    },
  },
} as const;

export const getBillRouteSchema = { ...billIdRoute, summary: "Get bill with line items" } as const;
export const finalizeBillRouteSchema = { ...billIdRoute, summary: "Finalize bill" } as const;
export const receiptRouteSchema = { ...billIdRoute, summary: "Receipt (HTML)" } as const;

export const applyBillDiscountRouteSchema = {
  ...billIdRoute,
  summary: "Apply bill-level discount",
  body: {
    type: "object",
    required: ["discount_amount"],
    additionalProperties: false,
    properties: {
      discount_amount: money,
      discount_reason: { type: "string", nullable: true },
    },
  },
} as const;

export const cancelBillRouteSchema = {
  ...billIdRoute,
  summary: "Cancel bill",
  body: {
    type: "object",
    required: ["reason"],
    additionalProperties: false,
    properties: {
      reason: { type: "string" },
      notes: { type: "string", nullable: true },
    },
  },
} as const;

export const recordPaymentRouteSchema = {
  ...tag,
  summary: "Record payment",
  body: {
    type: "object",
    required: ["bill_id", "amount", "payment_method"],
    additionalProperties: false,
    properties: {
      bill_id: uuid,
      amount: money,
      payment_method: {
        type: "string",
        enum: ["CASH", "CARD", "UPI", "CHEQUE", "BANK_TRANSFER"],
      },
      payment_date: { type: "string", format: "date-time", nullable: true },
      transaction_id: { type: "string", nullable: true },
      reference_number: { type: "string", nullable: true },
      received_by: { ...uuid, nullable: true },
      notes: { type: "string", nullable: true },
    },
  },
} as const;
