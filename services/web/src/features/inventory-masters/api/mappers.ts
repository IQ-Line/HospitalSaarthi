import type { VisitpadManufacturer } from '@/features/visitpad/types';
import type {
  InventoryCategoryApiRow,
  InventoryHsnGstApiRow,
  InventoryItemApiRow,
  InventoryItemTypeApiRow,
  InventoryStorageConditionApiRow,
  InventoryStoreTypeApiRow,
  InventoryUomApiRow,
} from './api-types';
import type {
  InventoryCategory,
  InventoryHsnGst,
  InventoryItemMaster,
  InventoryItemType,
  InventoryManufacturer,
  InventoryMasterStatus,
  InventoryStorageCondition,
  InventoryStoreType,
  InventoryUom,
} from '../types';

function toStatus(isActive: boolean): InventoryMasterStatus {
  return isActive ? 'active' : 'inactive';
}

function toNumber(value: number | string): number {
  return typeof value === 'number' ? value : Number.parseFloat(value);
}

export function mapInventoryCategoryRows(rows: InventoryCategoryApiRow[]): InventoryCategory[] {
  const nameById = new Map(rows.map((row) => [row.id, row.name]));
  return rows
    .filter((row) => !row.is_deleted)
    .map((row) => ({
      id: row.id,
      category_name: row.name,
      parent_category_id: row.parent_category_id,
      parent_category: row.parent_category_id
        ? (nameById.get(row.parent_category_id) ?? null)
        : null,
      status: toStatus(row.is_active),
    }));
}

export function mapInventoryItemTypeRow(row: InventoryItemTypeApiRow): InventoryItemType {
  return {
    id: row.id,
    item_type: row.name,
    status: toStatus(row.is_active),
  };
}

export function mapInventoryUomRow(row: InventoryUomApiRow): InventoryUom {
  return {
    id: row.id,
    name: row.name,
    abbreviation: row.abbreviation,
    status: toStatus(row.is_active),
  };
}

export function mapInventoryStorageConditionRow(
  row: InventoryStorageConditionApiRow,
): InventoryStorageCondition {
  return {
    id: row.id,
    storage_condition: row.name,
    description: row.description || null,
    status: toStatus(row.is_active),
  };
}

export function mapInventoryHsnGstRow(row: InventoryHsnGstApiRow): InventoryHsnGst {
  return {
    id: row.id,
    hsn_code: row.hsn_code,
    cgst_percent: toNumber(row.cgst_pct),
    sgst_percent: toNumber(row.sgst_pct),
    igst_percent: toNumber(row.igst_pct),
    activation_date: row.effective_from,
    status: toStatus(row.is_active),
  };
}

export function mapVisitpadManufacturerRow(row: VisitpadManufacturer): InventoryManufacturer {
  return {
    id: row.id,
    manufacturer: row.display_name,
    code: row.code?.trim() ? row.code : null,
    status: toStatus(row.is_active),
  };
}

export function mapInventoryStoreTypeRow(row: InventoryStoreTypeApiRow): InventoryStoreType {
  return {
    id: row.id,
    code: row.code,
    store_type: row.name,
    description: row.description || null,
    receive_stock: row.can_receive_stock,
    dispense: row.can_dispense,
    status: toStatus(row.is_active),
  };
}

export type InventoryItemLookupMaps = {
  itemTypeNameById: ReadonlyMap<string, string>;
  categoryNameById: ReadonlyMap<string, string>;
};

export function mapInventoryItemRow(
  row: InventoryItemApiRow,
  lookups: InventoryItemLookupMaps,
): InventoryItemMaster {
  const classification =
    row.item_classification === 'medicine' ? 'medicine' : 'inventory_item';

  return {
    id: row.id,
    item_code: row.item_code,
    item_name: row.name,
    display_name: row.display_name,
    classification,
    item_type: lookups.itemTypeNameById.get(row.item_type_id) ?? '—',
    product_category: row.category_id
      ? (lookups.categoryNameById.get(row.category_id) ?? '—')
      : '—',
    department: '—',
    manufacturer: '—',
    status: toStatus(row.is_active),
  };
}
