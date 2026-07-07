import { z } from "zod";

const stockStatusSchema = z.enum(["normal", "low", "critical"]);

export const listStockQuerySchema = z.object({
  store_id: z.string().uuid(),
  status: stockStatusSchema.optional(),
  search: z.string().trim().max(128).optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  page_size: z.coerce.number().int().min(1).max(500).optional().default(200),
});

export const stockBatchesQuerySchema = z.object({
  store_id: z.string().uuid(),
});
