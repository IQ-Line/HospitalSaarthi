import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { InventorySvcIndentRow, InventorySvcSingleResponse } from './api-types';
import { inventorySvcPatch, inventorySvcPost } from './inventory-api-client';
import { mapInventorySvcIndentDetail } from './mappers';
import { inventoryQueryKeys } from './query-keys';
import type {
  InventoryIndentPriority,
  InventoryIndentRoute,
  InventoryIndentType,
} from '../types';

export type SaveIndentDraftPayload = {
  indent_date: string;
  from_store_id: string;
  to_store_id: string;
  indent_type: InventoryIndentType;
  priority: InventoryIndentPriority;
  fulfillment_route: InventoryIndentRoute;
  purchase_indent_number?: string | null;
  remarks?: string | null;
  lines: Array<{
    item_id: string;
    requested_qty: number;
    line_remarks?: string | null;
    preferred_lot_id?: string | null;
    sort_order?: number;
  }>;
};

export function useInventoryIndentSaveDraft() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ indentId, payload }: { indentId?: string; payload: SaveIndentDraftPayload }) => {
      const response = indentId
        ? await inventorySvcPatch<InventorySvcSingleResponse<InventorySvcIndentRow>>(
            `/indents/${encodeURIComponent(indentId)}`,
            payload,
          )
        : await inventorySvcPost<InventorySvcSingleResponse<InventorySvcIndentRow>>('/indents', payload);
      return mapInventorySvcIndentDetail(response.data);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: inventoryQueryKeys.all });
    },
  });
}

export function useInventoryIndentSubmit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (indentId: string) => {
      const response = await inventorySvcPost<InventorySvcSingleResponse<InventorySvcIndentRow>>(
        `/indents/${encodeURIComponent(indentId)}/submit`,
        {},
      );
      return mapInventorySvcIndentDetail(response.data);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: inventoryQueryKeys.all });
    },
  });
}

export function useInventoryIndentApprove() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      indentId,
      lines,
    }: {
      indentId: string;
      lines: Array<{ line_id: string; approved_qty: number }>;
    }) => {
      const response = await inventorySvcPost<InventorySvcSingleResponse<InventorySvcIndentRow>>(
        `/indents/${encodeURIComponent(indentId)}/approve`,
        { lines },
      );
      return mapInventorySvcIndentDetail(response.data);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: inventoryQueryKeys.all });
    },
  });
}

export function useInventoryIndentReject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ indentId, reason }: { indentId: string; reason: string }) => {
      const response = await inventorySvcPost<InventorySvcSingleResponse<InventorySvcIndentRow>>(
        `/indents/${encodeURIComponent(indentId)}/reject`,
        { reason },
      );
      return mapInventorySvcIndentDetail(response.data);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: inventoryQueryKeys.all });
    },
  });
}

export function useInventoryIndentFulfill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (indentId: string) => {
      const response = await inventorySvcPost<InventorySvcSingleResponse<InventorySvcIndentRow>>(
        `/indents/${encodeURIComponent(indentId)}/fulfill`,
        {},
      );
      return mapInventorySvcIndentDetail(response.data);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: inventoryQueryKeys.all });
    },
  });
}
