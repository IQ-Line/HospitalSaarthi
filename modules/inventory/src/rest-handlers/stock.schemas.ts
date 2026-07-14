import { z } from "zod";

const stockStatusSchema = z.enum(["normal", "low", "critical"]);

export const listStockQuerySchema = z.object({
  store_id: z.string().uuid(),
  status: stockStatusSchema.optional(),
  search: z.string().trim().max(128).optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  page_size: z.coerce.number().int().min(1).max(500).optional().default(200),
});

export const listExpiringLotsQuerySchema = z.object({
  store_id: z.string().uuid(),
  within_days: z.coerce.number().int().min(1).max(365).optional().default(30),
  page_size: z.coerce.number().int().min(1).max(200).optional().default(100),
});

export const stockBatchesQuerySchema = z.object({
  store_id: z.string().uuid(),
});

export const adjustStockBodySchema = z.object({
  stock_id: z.string().uuid(),
  delta: z.number().finite().refine((value) => value !== 0, "delta must be non-zero"),
  reason: z.string().trim().min(1).max(500),
});
