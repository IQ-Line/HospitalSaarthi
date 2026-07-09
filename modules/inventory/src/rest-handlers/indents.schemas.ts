import { z } from "zod";

const indentStatusSchema = z.enum([
  "draft",
  "submitted",
  "approved",
  "partially_approved",
  "rejected",
  "in_fulfillment",
  "fulfilled",
]);
const indentTypeSchema = z.enum(["store_transfer", "pharmacy_refill", "emergency"]);
const indentPrioritySchema = z.enum(["normal", "urgent", "stat"]);
const fulfillmentRouteSchema = z.enum(["stock_transfer", "procurement"]);

export const listIndentsQuerySchema = z.object({
  search: z.string().trim().max(128).optional(),
  indent_number: z.string().trim().max(128).optional(),
  status: indentStatusSchema.optional(),
  from_store_id: z.string().uuid().optional(),
  to_store_id: z.string().uuid().optional(),
  indent_type: indentTypeSchema.optional(),
  include_lines: z
    .union([z.literal("true"), z.literal("false"), z.boolean()])
    .optional()
    .transform((value) => value === true || value === "true"),
  page: z.coerce.number().int().min(1).optional(),
  page_size: z.coerce.number().int().min(1).max(200).optional(),
});

export const indentLineInputSchema = z.object({
  item_id: z.string().uuid(),
  requested_qty: z.coerce.number().positive("Quantity must be > 0"),
  line_remarks: z.string().trim().max(500).nullable().optional(),
  preferred_lot_id: z.string().uuid().nullable().optional(),
  sort_order: z.coerce.number().int().min(0).optional(),
});

export const saveIndentDraftBodySchema = z
  .object({
    indent_date: z.string().date(),
    from_store_id: z.string().uuid(),
    to_store_id: z.string().uuid().nullable().default(null),
    indent_type: indentTypeSchema,
    priority: indentPrioritySchema,
    fulfillment_route: fulfillmentRouteSchema,
    purchase_indent_number: z.string().trim().max(120).nullable().optional(),
    remarks: z.string().trim().max(2000).nullable().optional(),
    lines: z.array(indentLineInputSchema).min(1),
  })
  .superRefine((body, ctx) => {
    if (body.fulfillment_route === "stock_transfer" && !body.to_store_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Destination store is required for stock transfer",
        path: ["to_store_id"],
      });
    }
    if (
      body.fulfillment_route === "stock_transfer" &&
      body.to_store_id &&
      body.from_store_id === body.to_store_id
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "From and to stores must differ",
        path: ["to_store_id"],
      });
    }
  });

export const approveIndentBodySchema = z.object({
  lines: z
    .array(
      z.object({
        line_id: z.string().uuid(),
        approved_qty: z.coerce.number().min(0),
      }),
    )
    .min(1),
  approval_remarks: z.string().trim().max(2000).nullable().optional(),
});

export const rejectIndentBodySchema = z.object({
  reason: z.string().trim().min(1).max(2000),
});

export const listIndentStoresQuerySchema = z.object({
  role: z.enum(["from", "to", "all"]).optional(),
  from_store_id: z.string().uuid().optional(),
});

export const listIndentItemsQuerySchema = z.object({
  from_store_id: z.string().uuid(),
  search: z.string().trim().max(128).optional(),
  classification: z.enum(["inventory", "medicine"]).optional(),
  active_only: z
    .union([z.literal("true"), z.literal("false"), z.boolean()])
    .optional()
    .transform((value) => value !== false && value !== "false"),
  page: z.coerce.number().int().min(1).optional(),
  page_size: z.coerce.number().int().min(1).max(200).optional(),
});

export const activeIndentCheckQuerySchema = z.object({
  from_store_id: z.string().uuid(),
  to_store_id: z.string().uuid().optional(),
  item_id: z.string().uuid(),
  exclude_indent_id: z.string().uuid().optional(),
});
