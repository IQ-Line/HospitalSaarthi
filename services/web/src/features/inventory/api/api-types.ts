/** inventory-svc list envelope (`GET /api/inventory/v1/stores`, `/items`, …). */
export type InventorySvcListResponse<T> = {
  data: T[];
  total: number;
};

export type InventorySvcStoreRow = {
  id: string;
  store_code: string;
  store_name: string;
  is_active: boolean;
  is_central_store: boolean;
};

export type InventorySvcItemRow = {
  id: string;
  item_code: string;
  name: string;
  display_name: string;
  item_classification: 'inventory' | 'medicine';
  is_active: boolean;
  unit_of_measure?: string;
  tracking_mode?: 'lot' | 'serial' | 'none';
  is_expirable?: boolean;
};

export type InventorySvcGrnRow = {
  id: string;
  grn_number: string;
  status: 'draft' | 'submitted';
  grn_type: 'purchase' | 'transfer';
  grn_date: string;
  voucher_invoice_no: string | null;
  submitted_at: string | null;
};

export type InventorySvcGrnListResponse = {
  data: InventorySvcGrnRow[];
  total: number;
  summary: {
    all: number;
    draft: number;
    submitted: number;
    purchase: number;
  };
};

export type InventorySvcGrnDetail = {
  id: string;
  grn_number: string;
  status: 'draft' | 'submitted';
  grn_type: 'purchase' | 'transfer';
  grn_date: string;
  store_id: string;
  manufacturer_id: string | null;
  indent_number: string | null;
  purchase_request_id: string | null;
  voucher_invoice_no: string | null;
  register_page_no: string | null;
  remarks: string | null;
  shipment_document_path: string | null;
  voucher_document_path: string | null;
  submitted_at: string | null;
  lines?: Array<{
    id: string;
    item_id: string;
    grn_qty: number;
    base_uom: string;
    purchase_uom: string | null;
    purchase_rate: number;
    requested_qty: number | null;
    lot_number: string;
    expiry_date: string | null;
    storage_location: string | null;
    line_remarks: string | null;
    item: {
      id: string;
      item_code: string;
      name: string;
      unit_of_measure: string;
    } | null;
  }>;
};

export type InventorySvcSingleResponse<T> = {
  data: T;
};

export type InventorySvcStockRow = {
  id: string;
  item_id: string;
  item_code: string;
  item_name: string;
  quantity: number;
  uom: string;
  reorder_at: number;
  min_reorder: number;
  status: 'critical' | 'low' | 'normal';
  store_id: string;
  batches: number;
};

export type InventorySvcStockListResponse = {
  data: InventorySvcStockRow[];
  total: number;
  summary: {
    critical: number;
    low: number;
    normal: number;
  };
};

export type InventorySvcStockBatchRow = {
  id: string;
  lot_number: string;
  expiry_date: string;
  received_date: string;
  quantity: number;
  expiry_status: 'expired' | 'expiring_soon' | null;
};

export type InventorySvcStockBatchesResponse = {
  data: InventorySvcStockBatchRow[];
  summary: {
    available_qty: number;
    status: 'critical' | 'low' | 'normal';
    batch_count: number;
  };
};

export type InventorySvcIndentStatus =
  | 'draft'
  | 'submitted'
  | 'approved'
  | 'partially_approved'
  | 'rejected'
  | 'in_fulfillment'
  | 'fulfilled';

export type InventorySvcIndentLine = {
  id: string;
  item_id: string;
  requested_qty: number;
  approved_qty: number | null;
  line_remarks: string | null;
  preferred_lot_id: string | null;
  sort_order: number;
  item: {
    id: string;
    item_code: string;
    name: string;
    unit_of_measure: string;
    is_lot_tracked: boolean;
  } | null;
};

export type InventorySvcIndentRow = {
  id: string;
  indent_number: string;
  indent_date: string;
  from_store_id: string;
  to_store_id: string;
  indent_type: 'store_transfer' | 'pharmacy_refill' | 'emergency';
  priority: 'normal' | 'urgent' | 'stat';
  status: InventorySvcIndentStatus;
  fulfillment_route: 'stock_transfer' | 'procurement';
  purchase_indent_number: string | null;
  rejection_reason: string | null;
  inventory_grn_id: string | null;
  remarks: string | null;
  from_store?: { store_id: string; store_code: string; store_name: string } | null;
  to_store?: { store_id: string; store_code: string; store_name: string } | null;
  lines?: InventorySvcIndentLine[];
};

export type InventorySvcIndentListResponse = {
  items: InventorySvcIndentRow[];
  total: number;
};

export type InventorySvcIndentStoreOption = {
  store_id: string;
  store_code: string;
  store_name: string;
  indent_authority: boolean;
  indent_target_store_id: string | null;
};

export type InventorySvcIndentItemOption = {
  item_id: string;
  item_code: string;
  name: string;
  unit_of_measure: string;
  is_lot_tracked: boolean;
  available_qty: number;
};
