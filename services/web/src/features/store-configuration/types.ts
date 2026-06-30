export type StoreStatus = 'active' | 'inactive';

export type InventoryStoreRecord = {
  id: string;
  store_code: string;
  store_name: string;
  store_type_id: string;
  facility_id: string;
  department_id: string | null;
  physical_location: string;
  can_receive_stock: boolean;
  can_dispense: boolean;
  can_issue_to_ward: boolean;
  track_batch_expiry: boolean;
  indent_authority: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type StoreListParams = {
  search?: string;
  status?: StoreStatus | 'all';
  pageIndex?: number;
  pageSize?: number;
};

export type PaginatedStoreList = {
  data: InventoryStoreRecord[];
  total: number;
};

export type StoreCreateInput = {
  store_name: string;
  store_type_id: string;
  facility_id: string;
  department_id: string;
  physical_location?: string;
  can_receive_stock?: boolean;
  can_dispense?: boolean;
  can_issue_to_ward?: boolean;
  track_batch_expiry?: boolean;
  indent_authority?: boolean;
  is_active?: boolean;
};

export type StoreUpdateInput = Partial<StoreCreateInput>;
