import { z } from "zod";

const grnTypeSchema = z.enum(["purchase", "transfer"]);
const grnStatusSchema = z.enum(["draft", "submitted"]);
const summaryFilterSchema = z.enum(["draft", "submitted", "purchase"]);

export const listGrnsQuerySchema = z.object({
  search: z.string().trim().max(128).optional(),
  status: grnStatusSchema.optional(),
  grn_type: grnTypeSchema.optional(),
  summary_filter: summaryFilterSchema.optional(),
});

const grnLineSchema = z.object({
  item_id: z.string().uuid(),
  grn_qty: z.coerce.number().positive("GRN quantity must be > 0"),
  base_uom: z.string().trim().min(1).max(64),
  purchase_uom: z.string().trim().max(64).nullable().optional(),
  purchase_rate: z.coerce.number().positive("Purchase rate must be > 0"),
  lot_number: z.string().trim().max(128).optional(),
  expiry_date: z.string().date().nullable().optional(),
  storage_location: z.string().trim().max(255).nullable().optional(),
  line_remarks: z.string().trim().max(500).nullable().optional(),
  requested_qty: z.coerce.number().positive().nullable().optional(),
  sort_order: z.coerce.number().int().min(0).optional(),
});

const grnHeaderFields = {
  grn_type: grnTypeSchema,
  grn_date: z.string().date(),
  store_id: z.string().uuid(),
  manufacturer_id: z.string().uuid().nullable().optional(),
  purchase_request_id: z.string().uuid().nullable().optional(),
  indent_number: z.string().trim().max(120).optional(),
  voucher_invoice_no: z.string().trim().max(128).optional(),
  register_page_no: z.string().trim().max(64).nullable().optional(),
  remarks: z.string().trim().max(250).nullable().optional(),
};

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function refinePurchaseHeader(
  data: {
    grn_type: z.infer<typeof grnTypeSchema>;
    grn_date: string;
    voucher_invoice_no?: string;
  },
  ctx: z.RefinementCtx,
): void {
  if (data.grn_date > todayIsoDate()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "GRN date cannot be in the future",
      path: ["grn_date"],
    });
  }
}

export const createGrnBodySchema = z
  .object({
    ...grnHeaderFields,
    lines: z.array(grnLineSchema).optional(),
  })
  .superRefine((data, ctx) => refinePurchaseHeader(data, ctx));

export const updateGrnBodySchema = z
  .object({
    grn_type: grnTypeSchema.optional(),
    grn_date: z.string().date().optional(),
    store_id: z.string().uuid().optional(),
    manufacturer_id: z.string().uuid().nullable().optional(),
    purchase_request_id: z.string().uuid().nullable().optional(),
    indent_number: z.string().trim().max(120).nullable().optional(),
    voucher_invoice_no: z.string().trim().max(128).optional(),
    register_page_no: z.string().trim().max(64).nullable().optional(),
    remarks: z.string().trim().max(250).nullable().optional(),
  })
  .refine((body) => Object.keys(body).length > 0, { message: "At least one field is required" })
  .superRefine((data, ctx) => {
    if (data.grn_type || data.grn_date || data.voucher_invoice_no !== undefined) {
      refinePurchaseHeader(
        {
          grn_type: data.grn_type ?? "purchase",
          grn_date: data.grn_date ?? todayIsoDate(),
          voucher_invoice_no: data.voucher_invoice_no,
        },
        ctx,
      );
    }
  });

export const replaceGrnLinesBodySchema = z.object({
  lines: z.array(grnLineSchema).min(1, "Add at least one line with an item"),
});
