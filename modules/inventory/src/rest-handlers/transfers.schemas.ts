import { z } from "zod";

const transferTypeSchema = z.enum(["normal", "emergency"]);
const transferStatusSchema = z.enum([
  "draft",
  "in_transit",
  "partially_received",
  "completed",
  "rejected",
  "cancelled",
]);

export const createStockTransferBodySchema = z.object({
  transfer_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  from_store_id: z.string().uuid(),
  to_store_id: z.string().uuid(),
  transfer_type: transferTypeSchema.default("normal"),
  remarks: z.string().max(250).nullable().optional(),
  inventory_indent_id: z.string().uuid().nullable().optional(),
  lines: z
    .array(
      z.object({
        item_id: z.string().uuid(),
        transfer_qty: z.coerce.number().positive(),
        line_remarks: z.string().nullable().optional(),
        sort_order: z.number().int().min(0).optional(),
      }),
    )
    .min(1),
});

export const listStockTransfersQuerySchema = z.object({
  search: z.string().optional(),
  status: transferStatusSchema.optional(),
  from_store_id: z.string().uuid().optional(),
  to_store_id: z.string().uuid().optional(),
  inventory_indent_id: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).optional(),
  page_size: z.coerce.number().int().min(1).max(200).optional(),
});

export const dispatchStockTransferBodySchema = z.object({
  lines: z
    .array(
      z.object({
        item_id: z.string().uuid(),
        dispatch_qty: z.coerce.number().positive(),
      }),
    )
    .optional(),
});

export const receiveStockTransferBodySchema = z.object({
  lines: z
    .array(
      z.object({
        item_id: z.string().uuid(),
        received_qty: z.coerce.number().min(0),
        accepted_qty: z.coerce.number().min(0),
        rejected_qty: z.coerce.number().min(0).optional(),
        rejection_reason: z.string().max(250).nullable().optional(),
      }),
    )
    .min(1),
});
