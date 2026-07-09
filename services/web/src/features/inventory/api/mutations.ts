import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClientBlob, apiClientFormData } from '@/lib/api-client';
import type { InventorySvcGrnDetail, InventorySvcSingleResponse } from './api-types';
import { inventorySvcPatch, inventorySvcPost, inventorySvcPut } from './inventory-api-client';
import { INVENTORY_API_BASE } from './query-keys';
import { mapUiGrnTypeToApi } from './mappers';
import { inventoryQueryKeys } from './query-keys';
import { purchaseUomAbbreviationForPayload } from '@/features/inventory-masters/api/uom-lookup';
import type { InventoryGrnLineDraft, InventoryGrnType } from '../types';

export type CreateGrnPayload = {
  grn_type: InventoryGrnType;
  grn_date: string;
  store_id: string;
  manufacturer_id?: string | null;
  indent_number?: string;
  voucher_invoice_no?: string;
  register_page_no?: string;
  remarks?: string;
  lines: InventoryGrnLineDraft[];
  uomOptions?: Array<{ id: string; name: string; abbreviation: string }>;
};

function mapLinesToApi(lines: InventoryGrnLineDraft[], uomOptions: CreateGrnPayload['uomOptions'] = []) {
  return lines
    .filter((line) => line.item_id)
    .map((line, index) => ({
      item_id: line.item_id,
      grn_qty: line.grn_qty,
      base_uom: line.uom || 'unit',
      purchase_uom: purchaseUomAbbreviationForPayload(line.purchase_uom, uomOptions ?? []),
      purchase_rate: line.purchase_rate,
      lot_number: line.batch_no,
      expiry_date: line.expiry_date || null,
      storage_location: line.storage || null,
      line_remarks: line.remarks || null,
      requested_qty: line.required_qty,
      sort_order: index,
    }));
}

function buildCreateBody(payload: CreateGrnPayload) {
  return {
    grn_type: mapUiGrnTypeToApi(payload.grn_type),
    grn_date: payload.grn_date,
    store_id: payload.store_id,
    manufacturer_id: payload.manufacturer_id ?? null,
    indent_number: payload.indent_number?.trim() || undefined,
    voucher_invoice_no: payload.voucher_invoice_no ?? '',
    register_page_no: payload.register_page_no || null,
    remarks: payload.remarks || null,
    lines: mapLinesToApi(payload.lines, payload.uomOptions),
  };
}

function buildUpdateBody(payload: Omit<CreateGrnPayload, 'lines'>) {
  return {
    grn_type: mapUiGrnTypeToApi(payload.grn_type),
    grn_date: payload.grn_date,
    store_id: payload.store_id,
    manufacturer_id: payload.manufacturer_id ?? null,
    indent_number: payload.indent_number?.trim() || null,
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
        { lines: mapLinesToApi(payload.lines, payload.uomOptions) },
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

type GrnDocumentKind = 'shipment' | 'voucher';

type UploadGrnDocumentResponse = {
  data: {
    document_kind: GrnDocumentKind;
    document_path: string;
    original_filename: string;
  };
};

export function useInventoryGrnUploadDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ grnId, kind, file }: { grnId: string; kind: GrnDocumentKind; file: File }) => {
      const formData = new FormData();
      formData.append('file', file);
      const response = await apiClientFormData<UploadGrnDocumentResponse>(
        `${INVENTORY_API_BASE}/grns/${encodeURIComponent(grnId)}/documents/${kind}`,
        formData,
      );
      return response.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: inventoryQueryKeys.all });
    },
  });
}

export function useInventoryGrnDocumentView() {
  return useMutation({
    mutationFn: async ({ grnId, kind }: { grnId: string; kind: GrnDocumentKind }) =>
      apiClientBlob(
        `${INVENTORY_API_BASE}/grns/${encodeURIComponent(grnId)}/documents/${kind}`,
      ),
  });
}
