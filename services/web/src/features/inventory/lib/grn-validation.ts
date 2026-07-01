import { z } from "zod";

/**
 * Client-side GRN validation ported from IQSandbox
 * `apps/iqhealth/src/modules/inventory/shared/schemas/grn-schema.ts`.
 *
 * Item-aware line rules (lot / expiry) require `tracking_mode` and `is_expirable`
 * on each line — populate from the selected item before validating.
 */

export const grnHeaderSchema = z
  .object({
    grn_type: z.enum(["purchase", "transfer"]),
    grn_date: z.string().min(1, "GRN date is required"),
    store_id: z.string().uuid("Select a store"),
    manufacturer_id: z.string(),
    voucher_invoice_no: z.string(),
  })
  .superRefine((data, ctx) => {
    const today = new Date().toISOString().slice(0, 10);
    if (data.grn_date > today) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "GRN date cannot be in the future",
        path: ["grn_date"],
      });
    }
    if (data.grn_type === "purchase") {
      if (!data.manufacturer_id || data.manufacturer_id === "__none__") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Manufacturer is required for purchase GRNs",
          path: ["manufacturer_id"],
        });
      }
    }
  });

export const grnLineSchema = z.object({
  item_id: z.string().uuid(),
  grn_qty: z.number().positive("GRN Qty must be > 0"),
  purchase_rate: z.number().positive("Rate must be greater than zero"),
  lot_number: z.string().optional(),
  expiry_date: z.string().nullable().optional(),
  requested_qty: z.number().nullable().optional(),
  /** DB value: `lot` | `serial` | `none` */
  tracking_mode: z.string().optional(),
  is_expirable: z.boolean().optional(),
});

export const grnLinesSchema = z
  .array(grnLineSchema)
  .min(1, "Add at least one line with an item")
  .superRefine((lines, ctx) => {
    for (let i = 0; i < lines.length; i++) {
      const ln = lines[i]!;
      if (ln.tracking_mode === "lot" && !ln.lot_number?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Batch / lot number is required for lot-tracked items",
          path: [i, "lot_number"],
        });
      }
      if (ln.is_expirable) {
        if (!ln.expiry_date?.trim()) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Expiry date is required for expirable items",
            path: [i, "expiry_date"],
          });
        } else if (new Date(ln.expiry_date) <= new Date()) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Expiry date must be in the future",
            path: [i, "expiry_date"],
          });
        }
      }
      if (
        ln.requested_qty != null &&
        Number.isFinite(ln.requested_qty) &&
        ln.grn_qty > ln.requested_qty
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "GRN Qty cannot exceed Requested Qty",
          path: [i, "grn_qty"],
        });
      }
    }
  });

/** Voucher required only when saving/submitting a purchase GRN (not draft header-only). */
export function validatePurchaseVoucherForSubmit(voucherInvoiceNo: string): string | null {
  if (!voucherInvoiceNo.trim()) {
    return "Voucher / invoice number is required";
  }
  return null;
}

export type GrnHeaderInput = z.infer<typeof grnHeaderSchema>;
export type GrnLineInput = z.infer<typeof grnLineSchema>;
