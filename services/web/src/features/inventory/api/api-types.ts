/** inventory-svc list envelope (`GET /api/inventory/v1/stores`, `/items`, …). */
export type InventorySvcListResponse<T> = {
  data: T[];
  total: number;
};

export type InventorySvcStoreRow = {
  id: string;
  store_code: string;
  store_name: string;
  is_active: boolean;
};

export type InventorySvcItemRow = {
  id: string;
  item_code: string;
  name: string;
  display_name: string;
  item_classification: 'inventory' | 'medicine';
  is_active: boolean;
};
