import { z } from "zod";

export const updateItemReorderBodySchema = z.object({
  reorder_point: z.number().finite().nonnegative(),
});
