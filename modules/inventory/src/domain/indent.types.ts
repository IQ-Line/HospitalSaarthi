export type IndentStatus =
  | "draft"
  | "submitted"
  | "approved"
  | "partially_approved"
  | "rejected"
  | "in_fulfillment"
  | "fulfilled";

export type IndentType = "store_transfer" | "pharmacy_refill" | "emergency";
export type IndentPriority = "normal" | "urgent" | "stat";
export type IndentFulfillmentRoute = "stock_transfer" | "procurement";

export const ACTIVE_INDENT_STATUSES: IndentStatus[] = [
  "draft",
  "submitted",
  "approved",
  "partially_approved",
  "in_fulfillment",
];

export type IndentRow = {
  id: string;
  iq_tenant_id: string;
  indent_number: string;
  indent_date: string;
  from_store_id: string;
  to_store_id: string;
  indent_type: IndentType;
  priority: IndentPriority;
  remarks: string | null;
  status: IndentStatus;
  fulfillment_route: IndentFulfillmentRoute;
  purchase_indent_number: string | null;
  rejection_reason: string | null;
  inventory_stock_transfer_id: string | null;
  inventory_purchase_request_id: string | null;
  inventory_grn_id: string | null;
  created_by: string | null;
  submitted_at: Date | null;
  approved_at: Date | null;
  approved_by: string | null;
  fulfilled_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

export type IndentLineRow = {
  id: string;
  iq_tenant_id: string;
  indent_id: string;
  item_id: string;
  requested_qty: string;
  approved_qty: string | null;
  line_remarks: string | null;
  preferred_lot_id: string | null;
  sort_order: number;
  created_at: Date;
  updated_at: Date;
};

export type ListIndentsQuery = {
  search?: string;
  status?: IndentStatus;
  from_store_id?: string;
  to_store_id?: string;
  indent_type?: IndentType;
  include_lines?: boolean;
  limit?: number;
  offset?: number;
};

export type IndentLineInput = {
  item_id: string;
  requested_qty: number;
  line_remarks?: string | null;
  preferred_lot_id?: string | null;
  sort_order?: number;
};

export type SaveIndentDraftInput = {
  indent_date: string;
  from_store_id: string;
  to_store_id: string;
  indent_type: IndentType;
  priority: IndentPriority;
  fulfillment_route: IndentFulfillmentRoute;
  purchase_indent_number?: string | null;
  remarks?: string | null;
  lines: IndentLineInput[];
};

export type ApproveIndentLineInput = {
  line_id: string;
  approved_qty: number;
};
