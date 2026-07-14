import { useMutation, useQueryClient } from '@tanstack/react-query';
import { inventorySvcPatch, inventorySvcPost } from './inventory-api-client';
import { inventoryQueryKeys } from './query-keys';

export type AdjustStockPayload = {
  stock_id: string;
  delta: number;
  reason: string;
};

export type UpdateItemReorderPayload = {
  item_id: string;
  reorder_point: number;
};

export function useInventoryAdjustStock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: AdjustStockPayload) => {
      return inventorySvcPost<{ data: { stock_id: string; quantity_after: number } }>(
        '/stock/adjust',
        payload,
      );
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: inventoryQueryKeys.all });
    },
  });
}

export function useInventoryUpdateItemReorder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: UpdateItemReorderPayload) => {
      return inventorySvcPatch<{ data: { id: string; reorder_point: number } }>(
        `/items/${encodeURIComponent(payload.item_id)}`,
        { reorder_point: payload.reorder_point },
      );
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: inventoryQueryKeys.all });
    },
  });
}
