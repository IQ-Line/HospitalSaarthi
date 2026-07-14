export type InventoryStockStatus = 'critical' | 'low' | 'normal';

export type InventoryListParams = {
  search?: string;
  store_id?: string;
  status?: 'all' | InventoryStockStatus;
};

export type InventoryStore = {
  id: string;
  name: string;
  store_code: string;
  is_central_store: boolean;
};

export type InventoryIndentStoreOption = {
  id: string;
  name: string;
  store_code: string;
  indent_authority: boolean;
  indent_target_store_id: string | null;
};

export type InventoryItemOption = {
  id: string;
  code: string;
  name: string;
  uom: string;
  tracking_mode?: 'lot' | 'serial' | 'none';
  is_expirable?: boolean;
};

export type InventoryManufacturerOption = {
  id: string;
  name: string;
};

export type InventoryDashboardStats = {
  active_items: number;
  low_stock: number;
  expiring_soon: number;
  pending_approvals: number;
};

export type InventoryLowStockItem = {
  id: string;
  item_name: string;
  item_code?: string;
  quantity: number;
  uom: string;
  reorder_at: number;
};

export type InventoryExpiringLot = {
  id: string;
  item_name: string;
  lot_number: string;
  expiry_date: string;
  quantity: number;
  uom: string;
};

export type InventoryStockLot = {
  id: string;
  lot_number: string;
  expiry_date: string;
  received_date: string;
  quantity: number;
};

export type InventoryStockRow = {
  id: string;
  item_name: string;
  item_code: string;
  quantity: number;
  uom: string;
  reorder_at: number;
  min_reorder: number;
  status: InventoryStockStatus;
  store_id: string;
  batches: number;
};

export type InventoryDashboardData = {
  stats: InventoryDashboardStats;
  low_stock_items: InventoryLowStockItem[];
  expiring_lots: InventoryExpiringLot[];
};

export type InventoryStockSummary = {
  critical: number;
  low: number;
  normal: number;
};

export type InventoryStockListData = {
  data: InventoryStockRow[];
  total: number;
  summary: InventoryStockSummary;
};

export type InventoryIndentStatus =
  | 'draft'
  | 'submitted'
  | 'approved'
  | 'partially_approved'
  | 'rejected'
  | 'in_fulfillment'
  | 'fulfilled';

export type InventoryIndentActiveMatch = {
  indent_id: string;
  indent_number: string;
  status: InventoryIndentStatus;
};

export type InventoryIndentPriority = 'NORMAL' | 'URGENT' | 'STAT';

export type InventoryIndentFulfillment = 'stock_transfer' | 'procurement';

export type InventoryIndentType = 'store_transfer' | 'pharmacy_refill' | 'emergency';

export type InventoryIndentRoute = 'stock_transfer' | 'procurement';

export type InventoryIndentLine = {
  id: string;
  item_id?: string;
  item_name: string;
  item_code: string;
  uom: string;
  qty_available?: number | null;
  requested_qty: number;
  approved_qty?: number | null;
  last_grn?: string | null;
  remarks?: string;
  preferred_lot_id?: string | null;
};

export type InventoryIndentRow = {
  id: string;
  indent_number: string;
  request_date: string;
  from_store_id: string;
  to_store_id: string;
  from_store: string;
  to_store: string;
  route: InventoryIndentRoute;
  indent_type: InventoryIndentType;
  priority: InventoryIndentPriority;
  status: InventoryIndentStatus;
  purchase_indent_number?: string | null;
  rejection_reason?: string | null;
  approval_remarks?: string | null;
  inventory_grn_id?: string | null;
  inventory_stock_transfer_id?: string | null;
  created_by?: string | null;
  remarks?: string | null;
  lines: InventoryIndentLine[];
};

export type InventoryIndentDetail = InventoryIndentRow & {
  remarks?: string | null;
  fulfillment_route: InventoryIndentRoute;
};

export type InventoryIndentListParams = {
  search?: string;
  status?: 'all' | InventoryIndentStatus;
  from_store_id?: string;
  to_store_id?: string;
  indent_type?: InventoryIndentType;
  page?: number;
  limit?: number;
};

export type InventoryIndentListData = {
  data: InventoryIndentRow[];
  total: number;
};

export type InventoryGrnStatus = 'Draft' | 'Submitted';

export type InventoryGrnType = 'Purchase' | 'Transfer';

export type InventoryGrnLogRow = {
  id: string;
  grn_number: string;
  status: InventoryGrnStatus;
  type: InventoryGrnType;
  grn_date: string;
  invoice_number: string | null;
  submitted_at: string | null;
};

export type InventoryGrnSummary = {
  all: number;
  draft: number;
  submitted: number;
  purchase: number;
};

export type InventoryGrnListParams = {
  search?: string;
  status?: 'all' | InventoryGrnStatus | 'draft' | 'submitted';
  type?: 'all' | InventoryGrnType;
  summary_filter?: 'all' | 'draft' | 'submitted' | 'purchase';
};

export type InventoryGrnListData = {
  data: InventoryGrnLogRow[];
  total: number;
  summary: InventoryGrnSummary;
};

export type InventoryGrnLineDraft = {
  id: string;
  item_id: string;
  item_code: string;
  item_name: string;
  uom: string;
  purchase_uom: string;
  tracking_mode?: 'lot' | 'serial' | 'none';
  is_expirable?: boolean;
  required_qty: number | null;
  remaining_qty: number | null;
  grn_qty: number;
  purchase_rate: number;
  batch_no: string;
  expiry_date: string;
  storage: string;
  remarks: string;
};

/** Line total per story: GRN Qty × Purchase Rate */
export function calcGrnLineAmount(grnQty: number, purchaseRate: number): number {
  if (!Number.isFinite(grnQty) || !Number.isFinite(purchaseRate)) return 0;
  return Math.round(grnQty * purchaseRate * 100) / 100;
}

export type InventoryReconciliationRow = {
  id: string;
  drug_name: string;
  site: string;
  batch: string;
  pharmacy_qty: number;
  inventory_qty: number;
  status: 'matched' | 'partial' | 'unlinked' | 'mismatch';
};

export type InventoryIndentFormValues = {
  indent_date: string;
  fulfillment_route: InventoryIndentFulfillment;
  from_store_id: string;
  to_store_id?: string;
  indent_type: InventoryIndentType;
  priority: 'normal' | 'urgent' | 'stat';
  remarks: string;
  lines: InventoryIndentLine[];
};

export type InventoryGrnFormValues = {
  grn_type: InventoryGrnType;
  grn_date: string;
  store_id: string;
  vendor_id: string;
  indent_number: string;
  voucher_number: string;
  remarks: string;
  register_page_no: string;
  lines: InventoryGrnLineDraft[];
};

export type InventoryTransferStatus =
  | 'Draft'
  | 'Dispatched'
  | 'Partially received'
  | 'Completed'
  | 'Rejected'
  | 'Cancelled';

export type InventoryTransferType = 'normal' | 'emergency';

export type InventoryTransferLine = {
  id: string;
  item_id?: string;
  item_code: string;
  item_name: string;
  uom: string;
  requested_qty?: number;
  approved_qty?: number;
  available_qty?: number;
  quantity: number;
  dispatched_qty?: number;
  received_qty?: number;
  accepted_qty?: number;
  rejected_qty?: number;
  rejection_reason?: string;
  line_remarks?: string;
};

export type InventoryTransferRow = {
  id: string;
  transfer_number: string;
  transfer_date: string;
  from_store_id: string | null;
  to_store_id: string | null;
  from_store: string;
  to_store: string;
  transfer_type: InventoryTransferType;
  status: InventoryTransferStatus;
  remarks?: string;
  inventory_indent_id?: string | null;
  indent_number?: string | null;
  line_count?: number;
  lines: InventoryTransferLine[];
};

export type InventoryTransferListParams = {
  search?: string;
  status?: 'draft' | 'in_transit' | 'partially_received' | 'completed' | 'rejected' | 'cancelled';
  statuses?: Array<'draft' | 'in_transit' | 'partially_received' | 'completed' | 'rejected' | 'cancelled'>;
  from_store_id?: string;
  to_store_id?: string;
  page?: number;
  limit?: number;
};

export type InventoryTransferListData = {
  data: InventoryTransferRow[];
  total: number;
};
