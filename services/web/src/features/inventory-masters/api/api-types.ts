/** Master Data inventory catalog list envelope (`GET /api/v1/master-data/inventory/*`). */

export type InventoryMasterListResponse<T> = {
  data: T[];
  total: number;
};

type InventoryMasterAuditFields = {
  id: string;
  iq_tenant_id: string | null;
  is_active: boolean;
  is_deleted: boolean;
  created_by?: string | null;
  updated_by?: string | null;
  created_at: string;
  updated_at: string;
};

export type InventoryCategoryApiRow = InventoryMasterAuditFields & {
  name: string;
  parent_category_id: string | null;
  description: string | null;
};

export type InventoryItemTypeApiRow = InventoryMasterAuditFields & {
  name: string;
};

export type InventoryUomApiRow = InventoryMasterAuditFields & {
  name: string;
  abbreviation: string;
};

export type InventoryStorageConditionApiRow = InventoryMasterAuditFields & {
  name: string;
  description: string;
};

export type InventoryHsnGstApiRow = InventoryMasterAuditFields & {
  hsn_code: string;
  effective_from: string;
  cgst_pct: number | string;
  sgst_pct: number | string;
  igst_pct: number | string;
  supporting_document_url: string | null;
  remarks: string | null;
};

export type InventoryStoreTypeApiRow = InventoryMasterAuditFields & {
  code: string;
  name: string;
  description: string;
  can_receive_stock: boolean;
  can_dispense: boolean;
  can_issue_to_ward: boolean;
  track_batch_expiry: boolean;
  indent_authority: boolean;
  default_indent_target_store_id: string | null;
};

/** Operational item catalog (`GET/POST /api/inventory/v1/items`). */
export type InventoryItemApiRow = {
  id: string;
  item_code: string;
  name: string;
  display_name: string;
  item_classification: 'inventory' | 'medicine';
  item_type_id: string;
  category_id: string | null;
  manufacturer_id: string | null;
  is_active: boolean;
};

export type InventoryItemListResponse = {
  data: InventoryItemApiRow[];
  total: number;
};

export type InventoryItemSingleResponse = {
  data: InventoryItemApiRow;
};
