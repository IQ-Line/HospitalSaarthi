import type { InventorySvcGrnListResponse, InventorySvcGrnRow, InventorySvcItemRow, InventorySvcStoreRow } from './api-types';
import type {
  InventoryGrnListData,
  InventoryGrnLogRow,
  InventoryGrnType,
  InventoryItemOption,
  InventoryStore,
} from '../types';

export function mapInventorySvcStoreRow(row: InventorySvcStoreRow): InventoryStore {
  return {
    id: row.id,
    name: row.store_name,
    store_code: row.store_code,
  };
}

export function mapInventorySvcItemRow(row: InventorySvcItemRow): InventoryItemOption {
  return {
    id: row.id,
    code: row.item_code,
    name: row.display_name?.trim() ? row.display_name : row.name,
    uom: '',
  };
}

const GRN_STATUS_MAP = {
  draft: 'Draft',
  submitted: 'Submitted',
} as const;

const GRN_TYPE_MAP = {
  purchase: 'Purchase',
  transfer: 'Transfer',
} as const;

export function mapInventorySvcGrnRow(row: InventorySvcGrnRow): InventoryGrnLogRow {
  return {
    id: row.id,
    grn_number: row.grn_number,
    status: GRN_STATUS_MAP[row.status],
    type: GRN_TYPE_MAP[row.grn_type],
    grn_date: row.grn_date,
    invoice_number: row.voucher_invoice_no,
    submitted_at: row.submitted_at,
  };
}

export function mapInventorySvcGrnListResponse(response: InventorySvcGrnListResponse): InventoryGrnListData {
  return {
    data: response.data.map(mapInventorySvcGrnRow),
    total: response.total,
    summary: response.summary,
  };
}

export function mapUiGrnTypeToApi(type: InventoryGrnType): 'purchase' | 'transfer' {
  return type === 'Purchase' ? 'purchase' : 'transfer';
}
