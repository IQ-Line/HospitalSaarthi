import { z } from "zod";

/**
 * Client-side GRN validation ported from IQSandbox
 * `apps/iqhealth/src/modules/inventory/shared/schemas/grn-schema.ts`.
 *
 * Item-aware line rules (lot / expiry) require `tracking_mode` and `is_expirable`
 * on each line — populate from the selected item before validating.
 */

export type GrnValidationMode = "draft" | "submit";

export type GrnFormLineInput = {
  id: string;
  item_id: string;
  grn_qty: number;
  purchase_rate: number;
  batch_no: string;
  expiry_date: string;
  required_qty: number | null;
  tracking_mode?: string;
  is_expirable?: boolean;
};

export type GrnFormInput = {
  grn_type: "purchase" | "transfer";
  grn_date: string;
  store_id: string;
  vendor_id: string;
  voucher_invoice_no: string;
  remarks: string;
  register_page_no: string;
  lines: GrnFormLineInput[];
};

export type GrnHeaderFieldErrors = Partial<
  Record<"grn_date" | "store_id" | "vendor_id" | "voucher_invoice_no" | "remarks" | "register_page_no", string>
>;

export type GrnLineFieldErrors = Partial<
  Record<"item_id" | "grn_qty" | "purchase_rate" | "batch_no" | "expiry_date", string>
>;

export type GrnFormValidationResult = {
  ok: boolean;
  header: GrnHeaderFieldErrors;
  lines: Record<string, GrnLineFieldErrors>;
  general?: string;
};

const uuidSchema = z.string().uuid();

export const grnHeaderSchema = z
  .object({
    grn_type: z.enum(["purchase", "transfer"]),
    grn_date: z.string().min(1, "GRN date is required"),
    store_id: z.string().uuid("Select a store"),
    vendor_id: z.string(),
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
  });

const grnSubmitHeaderSchema = grnHeaderSchema.superRefine((data, ctx) => {
  if (data.grn_type !== "purchase") return;
  if (!data.voucher_invoice_no.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Voucher / invoice number is required",
      path: ["voucher_invoice_no"],
    });
  }
  if (!uuidSchema.safeParse(data.vendor_id).success) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Select a vendor for purchase GRN",
      path: ["vendor_id"],
    });
  }
});

export const grnLineSchema = z
  .object({
    item_id: z.string().uuid("Select an item"),
    grn_qty: z.number().positive("GRN Qty must be > 0"),
    purchase_rate: z.number().positive("Purchase rate must be greater than zero"),
    lot_number: z.string().optional(),
    expiry_date: z.string().nullable().optional(),
    requested_qty: z.number().nullable().optional(),
    /** DB value: `lot` | `serial` | `none` */
    tracking_mode: z.string().optional(),
    is_expirable: z.boolean().optional(),
  })
  .superRefine((ln, ctx) => {
    if (ln.tracking_mode === "lot" && !ln.lot_number?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Batch / lot number is required for lot-tracked items",
        path: ["lot_number"],
      });
    }
    if (ln.is_expirable) {
      if (!ln.expiry_date?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Expiry date is required for expirable items",
          path: ["expiry_date"],
        });
      } else if (new Date(ln.expiry_date) <= new Date()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Expiry date must be in the future",
          path: ["expiry_date"],
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
        path: ["grn_qty"],
      });
    }
  });

export const grnLinesSchema = z
  .array(grnLineSchema)
  .min(1, "Add at least one line with an item");

/** Voucher required only when saving/submitting a purchase GRN (not draft header-only). */
export function validatePurchaseVoucherForSubmit(voucherInvoiceNo: string): string | null {
  if (!voucherInvoiceNo.trim()) {
    return "Voucher / invoice number is required";
  }
  return null;
}

function headerErrorsFromZod(error: z.ZodError): GrnHeaderFieldErrors {
  const out: GrnHeaderFieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !(key in out)) {
      out[key as keyof GrnHeaderFieldErrors] = issue.message;
    }
  }
  return out;
}

function validateOptionalHeaderFields(input: GrnFormInput): GrnHeaderFieldErrors {
  const errors: GrnHeaderFieldErrors = {};
  if (input.remarks.length > 250) {
    errors.remarks = "Remarks must be at most 250 characters";
  }
  const registerPage = input.register_page_no.trim();
  if (registerPage && !/^\d+$/.test(registerPage)) {
    errors.register_page_no = "Register page no. must be numeric";
  }
  return errors;
}

/** Validate GRN form before save draft or submit. */
export function validateGrnForm(input: GrnFormInput, mode: GrnValidationMode): GrnFormValidationResult {
  const header: GrnHeaderFieldErrors = {};
  const lines: Record<string, GrnLineFieldErrors> = {};

  const headerSchema = mode === "submit" ? grnSubmitHeaderSchema : grnHeaderSchema;
  const headerResult = headerSchema.safeParse({
    grn_type: input.grn_type,
    grn_date: input.grn_date,
    store_id: input.store_id,
    vendor_id: input.vendor_id,
    voucher_invoice_no: input.voucher_invoice_no,
  });

  if (!headerResult.success) {
    Object.assign(header, headerErrorsFromZod(headerResult.error));
  }

  Object.assign(header, validateOptionalHeaderFields(input));

  if (mode === "submit") {
    const filledLines = input.lines.filter((line) => line.item_id);
    if (filledLines.length === 0) {
      return {
        ok: false,
        header,
        lines,
        general: "Add at least one line with an item",
      };
    }

    const seenItems = new Set<string>();
    const lineInputs = filledLines.map((line) => ({
      item_id: line.item_id,
      grn_qty: line.grn_qty,
      purchase_rate: line.purchase_rate,
      lot_number: line.batch_no,
      expiry_date: line.expiry_date || null,
      requested_qty: line.required_qty,
      tracking_mode: line.tracking_mode,
      is_expirable: line.is_expirable,
    }));

    for (const line of filledLines) {
      if (seenItems.has(line.item_id)) {
        lines[line.id] = { ...(lines[line.id] ?? {}), item_id: "Duplicate item on GRN lines" };
      } else {
        seenItems.add(line.item_id);
      }
    }

    const linesResult = grnLinesSchema.safeParse(lineInputs);
    if (!linesResult.success) {
      for (const issue of linesResult.error.issues) {
        const index = issue.path[0];
        if (typeof index !== "number" || !filledLines[index]) continue;
        const lineId = filledLines[index]!.id;
        const field = issue.path[issue.path.length - 1];
        const mapped =
          field === "lot_number"
            ? "batch_no"
            : field === "purchase_rate" ||
                field === "item_id" ||
                field === "grn_qty" ||
                field === "expiry_date"
              ? field
              : issue.path.length === 0
                ? "item_id"
                : null;
        if (!mapped) continue;
        const current = lines[lineId] ?? {};
        if (!current[mapped as keyof GrnLineFieldErrors]) {
          lines[lineId] = { ...current, [mapped]: issue.message };
        }
      }
    }
  }

  const ok =
    Object.keys(header).length === 0 &&
    Object.keys(lines).length === 0;

  return { ok, header, lines };
}

/** First user-facing error message for toast display. */
export function firstGrnValidationMessage(result: GrnFormValidationResult): string | null {
  if (result.ok) return null;
  if (result.general) return result.general;
  const headerMsg = Object.values(result.header)[0];
  if (headerMsg) return headerMsg;
  for (const lineErrors of Object.values(result.lines)) {
    const msg = Object.values(lineErrors)[0];
    if (msg) return msg;
  }
  return "Please fix validation errors before continuing";
}

export type GrnHeaderInput = z.infer<typeof grnHeaderSchema>;
export type GrnLineInput = z.infer<typeof grnLineSchema>;
