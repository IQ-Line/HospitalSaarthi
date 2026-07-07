import type { InventoryMasterTabId } from '../types';
import { INVENTORY_ITEMS_API_BASE, INVENTORY_MASTERS_API_BASE } from '../api/query-keys';

const VISITPAD_MANUFACTURERS_BASE = '/api/v1/master-data/visitpad/manufacturers';

/** REST base path for catalog CRUD, or `null` when the tab has no backend yet. */
export function inventoryMasterApiBasePath(tabId: InventoryMasterTabId): string | null {
  switch (tabId) {
    case 'categories':
      return `${INVENTORY_MASTERS_API_BASE}/categories`;
    case 'item-types':
      return `${INVENTORY_MASTERS_API_BASE}/item-types`;
    case 'uom':
      return `${INVENTORY_MASTERS_API_BASE}/uoms`;
    case 'storage-conditions':
      return `${INVENTORY_MASTERS_API_BASE}/storage-conditions`;
    case 'hsn-gst':
      return `${INVENTORY_MASTERS_API_BASE}/hsn-gst`;
    case 'store-types':
      return `${INVENTORY_MASTERS_API_BASE}/store-types`;
    case 'manufacturers':
      return VISITPAD_MANUFACTURERS_BASE;
    case 'item-master':
      return INVENTORY_ITEMS_API_BASE;
    default: {
      const _exhaustive: never = tabId;
      return _exhaustive;
    }
  }
}
