export type InventoryMasterStatus = 'active' | 'inactive';

export type InventoryMasterListParams = {
  search?: string;
  status?: 'all' | InventoryMasterStatus;
  pageIndex?: number;
  pageSize?: number;
  /** Item list: filter by product category or sub-category id. */
  categoryId?: string;
  /** Item list: server-side classification filter. */
  classification?: 'all' | 'inventory_item' | 'medicine';
};

export type PaginatedList<T> = {
  data: T[];
  total: number;
};

export type InventoryItemMaster = {
  id: string;
  item_code: string;
  item_name: string;
  display_name: string;
  classification: 'inventory_item' | 'medicine';
  item_type: string;
  product_category: string;
  department: string;
  manufacturer: string;
  status: InventoryMasterStatus;
};

export type InventoryCategory = {
  id: string;
  category_name: string;
  parent_category_id: string | null;
  parent_category: string | null;
  status: InventoryMasterStatus;
};

export type InventoryItemType = {
  id: string;
  item_type: string;
  status: InventoryMasterStatus;
};

export type InventoryUom = {
  id: string;
  name: string;
  abbreviation: string;
  status: InventoryMasterStatus;
};

export type InventoryStorageCondition = {
  id: string;
  storage_condition: string;
  description: string | null;
  status: InventoryMasterStatus;
};

export type InventoryHsnGst = {
  id: string;
  hsn_code: string;
  cgst_percent: number;
  sgst_percent: number;
  igst_percent: number;
  activation_date: string;
  status: InventoryMasterStatus;
};

export type InventoryManufacturer = {
  id: string;
  manufacturer: string;
  code: string | null;
  status: InventoryMasterStatus;
};

export type InventoryStoreType = {
  id: string;
  code: string;
  store_type: string;
  description: string | null;
  receive_stock: boolean;
  dispense: boolean;
  status: InventoryMasterStatus;
};

export type InventoryMasterTabId =
  | 'item-master'
  | 'categories'
  | 'item-types'
  | 'uom'
  | 'storage-conditions'
  | 'hsn-gst'
  | 'manufacturers'
  | 'store-types';
