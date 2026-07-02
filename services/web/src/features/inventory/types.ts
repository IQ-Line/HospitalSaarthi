export type InventoryStockStatus = 'critical' | 'low' | 'normal';

export type InventoryListParams = {
  search?: string;
  store_id?: string;
  status?: 'all' | InventoryStockStatus;
};

export type InventoryStore = {
  id: string;
  name: string;
  branch: string;
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

export type InventoryStockRow = {
  id: string;
  item_name: string;
  item_code: string;
  quantity: number;
  uom: string;
  reorder_at: number;
  status: InventoryStockStatus;
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
