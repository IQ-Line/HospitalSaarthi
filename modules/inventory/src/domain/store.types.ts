export type StoreRow = {
  id: string;
  iq_tenant_id: string;
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
  indent_target_store_id: string | null;
  is_active: boolean;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
};

export type StoreOperationalFlags = {
  can_receive_stock: boolean;
  can_dispense: boolean;
  can_issue_to_ward: boolean;
  track_batch_expiry: boolean;
  indent_authority: boolean;
};

export type MasterDataStoreType = StoreOperationalFlags & {
  id: string;
  code: string;
  name: string;
  is_active: boolean;
};

export type CreateStoreInput = {
  store_name: string;
  store_type_id: string;
  facility_id: string;
  department_id: string;
  physical_location?: string;
  is_active?: boolean;
} & Partial<StoreOperationalFlags>;

export type UpdateStoreInput = Partial<
  Pick<
    CreateStoreInput,
    | "store_name"
    | "store_type_id"
    | "facility_id"
    | "department_id"
    | "physical_location"
    | "is_active"
  >
> &
  Partial<StoreOperationalFlags>;

export type ListStoresQuery = {
  limit?: number;
  offset?: number;
  search?: string;
  is_active?: boolean;
};
