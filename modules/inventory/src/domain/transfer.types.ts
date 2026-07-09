export type StockTransferStatus = "draft" | "in_transit" | "completed" | "cancelled";

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
  inventory_indent_id?: string;
  limit?: number;
  offset?: number;
};
