import type { StockStatus } from "./stock-status.js";

export type ListStockQuery = {
  store_id: string;
  status?: StockStatus;
  search?: string;
  page?: number;
  page_size?: number;
};

export type StockSummaryRow = {
  item_id: string;
  item_code: string;
  item_name: string;
  unit_of_measure: string;
  reorder_point: string;
  available_qty: string;
  batch_count: number;
};

export type StockBatchRow = {
  stock_id: string;
  lot_id: string | null;
  lot_number: string | null;
  expiry_date: string | null;
  received_date: string | null;
  quantity: string;
};

export type StockListSummary = {
  critical: number;
  low: number;
  normal: number;
};

export type WiredStockRow = {
  id: string;
  item_id: string;
  item_code: string;
  item_name: string;
  unit_of_measure: string;
  available_qty: number;
  reorder_point: number;
  status: StockStatus;
  store_id: string;
  batch_count: number;
};

export type ListExpiringLotsQuery = {
  store_id: string;
  within_days?: number;
  page_size?: number;
};

export type ExpiringLotRow = {
  id: string;
  item_id: string;
  item_name: string;
  item_code: string;
  lot_number: string;
  expiry_date: string;
  quantity: number;
  uom: string;
};
