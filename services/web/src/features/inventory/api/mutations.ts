import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { InventorySvcGrnDetail, InventorySvcSingleResponse } from './api-types';
import { inventorySvcPatch, inventorySvcPost, inventorySvcPut } from './inventory-api-client';
import { mapUiGrnTypeToApi } from './mappers';
import { inventoryQueryKeys } from './query-keys';
import type { InventoryGrnLineDraft, InventoryGrnType } from '../types';

export type CreateGrnPayload = {
  grn_type: InventoryGrnType;
  grn_date: string;
  store_id: string;
  manufacturer_id?: string | null;
  voucher_invoice_no?: string;
  register_page_no?: string;
  remarks?: string;
  lines: InventoryGrnLineDraft[];
};

function mapLinesToApi(lines: InventoryGrnLineDraft[]) {
  return lines
    .filter((line) => line.item_id)
    .map((line, index) => ({
      item_id: line.item_id,
      grn_qty: line.grn_qty,
      base_uom: line.uom || 'unit',
      purchase_rate: line.amount,
      lot_number: line.batch_no,
      expiry_date: line.expiry_date || null,
      storage_location: line.storage || null,
      line_remarks: line.remarks || null,
      sort_order: index,
    }));
}

function buildCreateBody(payload: CreateGrnPayload) {
  return {
    grn_type: mapUiGrnTypeToApi(payload.grn_type),
    grn_date: payload.grn_date,
    store_id: payload.store_id,
    manufacturer_id: payload.manufacturer_id ?? null,
    voucher_invoice_no: payload.voucher_invoice_no ?? '',
    register_page_no: payload.register_page_no || null,
    remarks: payload.remarks || null,
    lines: mapLinesToApi(payload.lines),
  };
}

function buildUpdateBody(payload: Omit<CreateGrnPayload, 'lines'>) {
  return {
    grn_type: mapUiGrnTypeToApi(payload.grn_type),
    grn_date: payload.grn_date,
    store_id: payload.store_id,
    manufacturer_id: payload.manufacturer_id ?? null,
    voucher_invoice_no: payload.voucher_invoice_no ?? '',
    register_page_no: payload.register_page_no || null,
    remarks: payload.remarks || null,
  };
}

export function useInventoryGrnCreate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateGrnPayload) => {
      const response = await inventorySvcPost<InventorySvcSingleResponse<InventorySvcGrnDetail>>(
        '/grns',
        buildCreateBody(payload),
      );
      return response.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: inventoryQueryKeys.all });
    },
  });
}

export function useInventoryGrnUpdate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ grnId, payload }: { grnId: string; payload: CreateGrnPayload }) => {
      await inventorySvcPatch(`/grns/${encodeURIComponent(grnId)}`, buildUpdateBody(payload));
      const response = await inventorySvcPut<InventorySvcSingleResponse<InventorySvcGrnDetail>>(
        `/grns/${encodeURIComponent(grnId)}/lines`,
        { lines: mapLinesToApi(payload.lines) },
      );
      return response.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: inventoryQueryKeys.all });
    },
  });
}

export function useInventoryGrnSubmit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (grnId: string) => {
      const response = await inventorySvcPost<InventorySvcSingleResponse<InventorySvcGrnDetail>>(
        `/grns/${encodeURIComponent(grnId)}/submit`,
        {},
      );
      return response.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: inventoryQueryKeys.all });
    },
  });
}
