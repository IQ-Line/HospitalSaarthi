import type {
  InventorySvcGrnListResponse,
  InventorySvcGrnRow,
  InventorySvcItemRow,
  InventorySvcStockBatchRow,
  InventorySvcStockListResponse,
  InventorySvcStockRow,
  InventorySvcStoreRow,
} from './api-types';
import type {
  InventoryGrnListData,
  InventoryGrnLogRow,
  InventoryGrnType,
  InventoryItemOption,
  InventoryStockListData,
  InventoryStockLot,
  InventoryStockRow,
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

export function mapInventorySvcStockRow(row: InventorySvcStockRow): InventoryStockRow {
  return {
    id: row.id,
    item_name: row.item_name,
    item_code: row.item_code,
    quantity: row.quantity,
    uom: row.uom,
    reorder_at: row.reorder_at,
    min_reorder: row.min_reorder,
    status: row.status,
    store_id: row.store_id,
    batches: row.batches,
  };
}

export function mapInventorySvcStockListResponse(
  response: InventorySvcStockListResponse,
): InventoryStockListData {
  return {
    data: response.data.map(mapInventorySvcStockRow),
    total: response.total,
    summary: response.summary,
  };
}

export function mapInventorySvcStockBatchRow(row: InventorySvcStockBatchRow): InventoryStockLot {
  return {
    id: row.id,
    lot_number: row.lot_number,
    expiry_date: row.expiry_date,
    received_date: row.received_date,
    quantity: row.quantity,
  };
}
