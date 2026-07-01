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
};

export type InventoryItemOption = {
  id: string;
  code: string;
  name: string;
  uom: string;
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
  | 'Draft'
  | 'Approved'
  | 'In Fulfillment'
  | 'Fulfilled'
  | 'Cancelled';

export type InventoryIndentPriority = 'NORMAL' | 'URGENT' | 'STAT';

export type InventoryIndentRoute = 'Transfer' | 'Procurement';

export type InventoryIndentLine = {
  id: string;
  item_id?: string;
  item_name: string;
  item_code: string;
  uom: string;
  qty_available?: number | null;
  requested_qty: number;
  last_grn?: string | null;
  remarks?: string;
};

export type InventoryIndentRow = {
  id: string;
  indent_number: string;
  request_date: string;
  from_store: string;
  to_store: string;
  route: InventoryIndentRoute;
  priority: InventoryIndentPriority;
  status: InventoryIndentStatus;
  lines: InventoryIndentLine[];
};

export type InventoryIndentListParams = {
  search?: string;
  status?: 'all' | InventoryIndentStatus;
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
  required_qty: number | null;
  remaining_qty: number | null;
  grn_qty: number;
  amount: number;
  batch_no: string;
  expiry_date: string;
  storage: string;
  remarks: string;
};

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
  fulfillment: 'stock_transfer' | 'procurement';
  from_store_id: string;
  to_store_id: string;
  indent_type: 'store_transfer' | 'pharmacy_refill' | 'emergency';
  priority: 'normal' | 'urgent' | 'stat';
  remarks: string;
  lines: InventoryIndentLine[];
};

export type InventoryGrnFormValues = {
  grn_type: InventoryGrnType;
  grn_date: string;
  store_id: string;
  manufacturer_id: string;
  purchase_indent_id: string;
  voucher_number: string;
  remarks: string;
  register_page_no: string;
  lines: InventoryGrnLineDraft[];
};
