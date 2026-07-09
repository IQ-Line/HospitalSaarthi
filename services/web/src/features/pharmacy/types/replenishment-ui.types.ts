export type ReplenishmentTab = 'low-stock' | 'indents';

export type IndentPriority = 'normal' | 'urgent' | 'stat';

export type IndentRequestStatus =
  | 'draft'
  | 'procurement_pending'
  | 'fulfilled'
  | 'submitted'
  | 'approved'
  | 'rejected';

export type PharmacyLowStockRow = {
  id: string;
  drug_name: string;
  item_code: string;
  available_qty: number;
  reorder_level: number;
  status: 'low_stock' | 'out_of_stock' | 'adequate';
};

export type PharmacyLowStockListParams = {
  q?: string;
  page: number;
  page_size: number;
};

export type PharmacyLowStockListResponse = {
  items: PharmacyLowStockRow[];
  total: number;
  page: number;
  page_size: number;
};

export type IndentRequestLine = {
  id: string;
  item_name: string;
  item_code: string;
  requested_qty: number;
  approved_qty?: number | null;
};

export type IndentRequestRow = {
  id: string;
  indent_number: string;
  request_date: string;
  to_store_name: string;
  priority: IndentPriority;
  status: IndentRequestStatus;
  lines: IndentRequestLine[];
};

export type IndentRequestListParams = {
  q?: string;
  status?: IndentRequestStatus | '__all__';
  page: number;
  page_size: number;
};

export type IndentRequestListResponse = {
  items: IndentRequestRow[];
  total: number;
  page: number;
  page_size: number;
};

export type PharmacyStoreOption = {
  id: string;
  name: string;
};

export type IndentItemSearchResult = {
  id: string;
  name: string;
  item_code: string;
  available_qty: number;
  base_uom: string;
  last_grn_date: string | null;
};

export type IndentDraftLine = {
  key: string;
  item_id: string;
  item_name: string;
  item_code: string;
  available_qty: number | null;
  base_uom: string;
  requested_qty: string;
  last_grn_date: string | null;
  line_remarks: string;
};

export type IndentDraftForm = {
  indent_date: string;
  from_store_id: string;
  to_store_id: string;
  priority: IndentPriority;
  remarks: string;
  lines: IndentDraftLine[];
};
