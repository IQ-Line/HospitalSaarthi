export type GrnStatus = "draft" | "submitted";
export type GrnType = "purchase" | "transfer";

export type GrnRow = {
  id: string;
  iq_tenant_id: string;
  grn_number: string;
  status: GrnStatus;
  grn_type: GrnType;
  grn_date: string;
  inventory_store_id: string;
  manufacturer_id: string | null;
  purchase_request_id: string | null;
  voucher_invoice_no: string;
  register_page_no: string | null;
  remarks: string | null;
  shipment_document_path: string | null;
  voucher_document_path: string | null;
  created_by: string | null;
  submitted_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

export type GrnLineRow = {
  id: string;
  iq_tenant_id: string;
  grn_id: string;
  item_id: string;
  pr_line_id: string | null;
  requested_qty: string | null;
  grn_qty: string;
  base_uom: string;
  purchase_uom: string | null;
  purchase_to_base_factor: string;
  storage_location: string | null;
  lot_number: string;
  expiry_date: string | null;
  purchase_rate: string;
  line_remarks: string | null;
  sort_order: number;
  created_at: Date;
  updated_at: Date;
};

export type ListGrnsQuery = {
  search?: string;
  status?: GrnStatus;
  grn_type?: GrnType;
  summary_filter?: "draft" | "submitted" | "purchase";
};

export type GrnSummary = {
  all: number;
  draft: number;
  submitted: number;
  purchase: number;
};

export type CreateGrnLineInput = {
  item_id: string;
  grn_qty: number;
  base_uom: string;
  purchase_rate: number;
  lot_number?: string;
  expiry_date?: string | null;
  storage_location?: string | null;
  line_remarks?: string | null;
  sort_order?: number;
  requested_qty?: number | null;
};

export type CreateGrnInput = {
  grn_type: GrnType;
  grn_date: string;
  store_id: string;
  manufacturer_id?: string | null;
  purchase_request_id?: string | null;
  voucher_invoice_no?: string;
  register_page_no?: string | null;
  remarks?: string | null;
  lines?: CreateGrnLineInput[];
};

export type UpdateGrnInput = {
  grn_type?: GrnType;
  grn_date?: string;
  store_id?: string;
  manufacturer_id?: string | null;
  purchase_request_id?: string | null;
  voucher_invoice_no?: string;
  register_page_no?: string | null;
  remarks?: string | null;
};
