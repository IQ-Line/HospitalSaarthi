import type { InventoryMasterTabId } from './types';

export type InventoryMasterTabConfig = {
  id: InventoryMasterTabId;
  label: string;
  route: `/inventory-supply-masters/${InventoryMasterTabId}`;
  catalogModuleSlug: string;
  addLabel: string;
  searchPlaceholder: string;
  title: string;
  description: string;
};

export const INVENTORY_MASTER_TABS: readonly InventoryMasterTabConfig[] = [
  {
    id: 'item-master',
    label: 'Item Master',
    route: '/inventory-supply-masters/item-master',
    catalogModuleSlug: 'inventory-master',
    addLabel: 'Add Item',
    searchPlaceholder: 'Search items',
    title: 'Item Master',
    description: 'Manage inventory items, classifications, and linked master references.',
  },
  {
    id: 'categories',
    label: 'Item Category / Subcategory',
    route: '/inventory-supply-masters/categories',
    catalogModuleSlug: 'inventory-categories',
    addLabel: 'Add Product Category',
    searchPlaceholder: 'Search categories',
    title: 'Item Category / Subcategory',
    description: 'Define product category hierarchy for inventory items.',
  },
  {
    id: 'item-types',
    label: 'Item Type',
    route: '/inventory-supply-masters/item-types',
    catalogModuleSlug: 'inventory-item-types',
    addLabel: 'Add Item Type',
    searchPlaceholder: 'Search item types',
    title: 'Item Type',
    description: 'Configure item type classifications used across inventory.',
  },
  {
    id: 'uom',
    label: 'UOM',
    route: '/inventory-supply-masters/uom',
    catalogModuleSlug: 'inventory-uoms',
    addLabel: 'Add Unit of Measure',
    searchPlaceholder: 'Search units (name, abbreviation…)',
    title: 'Unit of Measure',
    description: 'Purchase, consumption, and sale units of measure.',
  },
  {
    id: 'storage-conditions',
    label: 'Storage Conditions',
    route: '/inventory-supply-masters/storage-conditions',
    catalogModuleSlug: 'inventory-storage-conditions',
    addLabel: 'Add Storage Condition',
    searchPlaceholder: 'Search storage conditions',
    title: 'Storage Conditions',
    description: 'Storage requirements for temperature-sensitive inventory.',
  },
  {
    id: 'hsn-gst',
    label: 'HSN / GST',
    route: '/inventory-supply-masters/hsn-gst',
    catalogModuleSlug: 'inventory-hsn-gst',
    addLabel: 'Add HSN & GST',
    searchPlaceholder: 'Search HSN codes',
    title: 'HSN / GST',
    description: 'HSN codes and GST rate schedules for inventory items.',
  },
  {
    id: 'manufacturers',
    label: 'Manufacturer',
    route: '/inventory-supply-masters/manufacturers',
    catalogModuleSlug: 'manufacturers',
    addLabel: 'Add Manufacturer',
    searchPlaceholder: 'Search manufacturers',
    title: 'Manufacturer',
    description: 'Manufacturers linked to inventory items (shared with Visitpad catalog).',
  },
  {
    id: 'store-types',
    label: 'Store Type',
    route: '/inventory-supply-masters/store-types',
    catalogModuleSlug: 'inventory-store-types',
    addLabel: 'Add Store Type',
    searchPlaceholder: 'Search store types',
    title: 'Store Type',
    description: 'Store type definitions for receive and dispense workflows.',
  },
] as const;

export const INVENTORY_MASTER_PAGE_TITLE = 'Inventory & Supply Masters';

export const INVENTORY_MASTER_DEFAULT_ROUTE =
  INVENTORY_MASTER_TABS[0]?.route ?? '/inventory-supply-masters/item-master';

export function getInventoryMasterTabConfig(tabId: InventoryMasterTabId): InventoryMasterTabConfig {
  const tab = INVENTORY_MASTER_TABS.find((entry) => entry.id === tabId);
  if (!tab) {
    throw new Error(`Unknown inventory master tab: ${tabId}`);
  }
  return tab;
}
