import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { CreateItemMasterPayload } from '@/features/inventory-masters/items/item-master-model';
import type { InventoryItemSingleResponse } from './api-types';
import { INVENTORY_ITEMS_API_BASE, inventoryMastersQueryKeys } from './query-keys';

export type CreateInventoryItemBody = CreateItemMasterPayload;

export function useInventoryItemCreate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateInventoryItemBody) =>
      apiClient<InventoryItemSingleResponse>(INVENTORY_ITEMS_API_BASE, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: inventoryMastersQueryKeys.all });
    },
  });
}
