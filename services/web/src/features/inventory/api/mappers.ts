import type { InventorySvcItemRow, InventorySvcStoreRow } from './api-types';
import type { InventoryItemOption, InventoryStore } from '../types';

export function mapInventorySvcStoreRow(row: InventorySvcStoreRow): InventoryStore {
  return {
    id: row.id,
    name: row.store_name,
    store_code: row.store_code,
  };
}

export function mapInventorySvcItemRow(row: InventorySvcItemRow): InventoryItemOption {
  return {
    id: row.id,
    code: row.item_code,
    name: row.display_name?.trim() ? row.display_name : row.name,
    uom: '',
  };
}
