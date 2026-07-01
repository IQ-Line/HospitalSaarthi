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
};

export type InventorySvcItemRow = {
  id: string;
  item_code: string;
  name: string;
  display_name: string;
  item_classification: 'inventory' | 'medicine';
  is_active: boolean;
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
  purchase_request_id: string | null;
  voucher_invoice_no: string | null;
  register_page_no: string | null;
  remarks: string | null;
  submitted_at: string | null;
  lines?: Array<{
    id: string;
    item_id: string;
    grn_qty: number;
    base_uom: string;
    purchase_rate: number;
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
