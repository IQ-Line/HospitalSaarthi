import { useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  InventorySvcSingleResponse,
  InventorySvcStockTransferRow,
} from './api-types';
import { inventorySvcPost } from './inventory-api-client';
import { mapInventorySvcStockTransferRow } from './mappers';
import { inventoryQueryKeys } from './query-keys';
import type { InventoryTransferType } from '../types';

export type CreateStockTransferPayload = {
  transfer_date: string;
  from_store_id: string;
  to_store_id: string;
  transfer_type: InventoryTransferType;
  remarks?: string | null;
  inventory_indent_id?: string | null;
  lines: Array<{
    item_id: string;
    transfer_qty: number;
    line_remarks?: string | null;
    sort_order?: number;
  }>;
};

export function useInventoryTransferCreate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateStockTransferPayload) => {
      const response = await inventorySvcPost<InventorySvcSingleResponse<InventorySvcStockTransferRow>>(
        '/transfers',
        payload,
      );
      return mapInventorySvcStockTransferRow(response.data);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: inventoryQueryKeys.all });
    },
  });
}

export type DispatchStockTransferPayload = {
  transferId: string;
  lines?: Array<{
    item_id: string;
    dispatch_qty: number;
  }>;
};

export function useInventoryTransferDispatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ transferId, lines }: DispatchStockTransferPayload) => {
      const response = await inventorySvcPost<InventorySvcSingleResponse<InventorySvcStockTransferRow>>(
        `/transfers/${transferId}/dispatch`,
        lines?.length ? { lines } : {},
      );
      return mapInventorySvcStockTransferRow(response.data);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: inventoryQueryKeys.all });
    },
  });
}

export type ReceiveStockTransferPayload = {
  transferId: string;
  lines: Array<{
    item_id: string;
    received_qty: number;
    accepted_qty: number;
    rejected_qty?: number;
    rejection_reason?: string | null;
  }>;
};

export function useInventoryTransferReceive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ transferId, lines }: ReceiveStockTransferPayload) => {
      const response = await inventorySvcPost<InventorySvcSingleResponse<InventorySvcStockTransferRow>>(
        `/transfers/${transferId}/receive`,
        { lines },
      );
      return mapInventorySvcStockTransferRow(response.data);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: inventoryQueryKeys.all });
    },
  });
}
