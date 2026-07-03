/** How the indent will be fulfilled — PR (procurement) or internal stock transfer. */
export type IndentFulfillmentRoute = "procurement" | "stock_transfer";

/** Business category of the indent (independent of fulfillment). */
export type IndentType = "store_transfer" | "pharmacy_refill" | "emergency";

export type IndentStatus =
  | "draft"
  | "submitted"
  | "approved"
  | "partially_approved"
  | "rejected"
  | "in_fulfillment"
  | "fulfilled";

export type IndentRow = {
  id: string;
  iq_tenant_id: string;
  indent_number: string;
  indent_date: string;
  from_store_id: string;
  to_store_id: string | null;
  indent_type: IndentType;
  fulfillment_route: IndentFulfillmentRoute;
  priority: string;
  remarks: string | null;
  status: IndentStatus;
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
  sort_order: number;
};
