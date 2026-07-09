export type StockTransferStatus =
  | "draft"
  | "in_transit"
  | "partially_received"
  | "completed"
  | "rejected"
  | "cancelled";

export type StockTransferType = "normal" | "emergency";

export type StockTransferRow = {
  id: string;
  iq_tenant_id: string;
  transfer_number: string;
  transfer_date: string;
  from_store_id: string;
  to_store_id: string;
  transfer_type: StockTransferType;
  status: StockTransferStatus;
  remarks: string | null;
  inventory_indent_id: string | null;
  created_by: string | null;
  created_at: Date;
  updated_at: Date;
};

export type StockTransferLineRow = {
  id: string;
  iq_tenant_id: string;
  stock_transfer_id: string;
  item_id: string;
  transfer_qty: string;
  received_qty: string | null;
  accepted_qty: string | null;
  rejected_qty: string | null;
  rejection_reason: string | null;
  line_remarks: string | null;
  sort_order: number;
  created_at: Date;
  updated_at: Date;
};

export type CreateStockTransferLineInput = {
  item_id: string;
  transfer_qty: number;
  line_remarks?: string | null;
  sort_order?: number;
};

export type CreateStockTransferInput = {
  transfer_date: string;
  from_store_id: string;
  to_store_id: string;
  transfer_type: StockTransferType;
  remarks?: string | null;
  inventory_indent_id?: string | null;
  lines: CreateStockTransferLineInput[];
};

export type ListStockTransfersQuery = {
  search?: string;
  status?: StockTransferStatus;
  statuses?: StockTransferStatus[];
  from_store_id?: string;
  to_store_id?: string;
  inventory_indent_id?: string;
  limit?: number;
  offset?: number;
};

export type DispatchStockTransferLineInput = {
  item_id: string;
  dispatch_qty: number;
};

export type DispatchStockTransferInput = {
  lines?: DispatchStockTransferLineInput[];
};

export type ReceiveStockTransferLineInput = {
  item_id: string;
  received_qty: number;
  accepted_qty: number;
  rejected_qty?: number;
  rejection_reason?: string | null;
};

export type ReceiveStockTransferInput = {
  lines: ReceiveStockTransferLineInput[];
};
