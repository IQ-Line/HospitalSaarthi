import { describe, expect, it } from 'vitest';
import { INVENTORY_MASTER_TABS } from '@/features/inventory-masters/inventory-masters-nav-model';
import { principalGrantsInventoryMasterTabAccess } from '@/lib/inventory-masters-route-access';

/** inventoryadmin@hospitalsaarthi.dev — L3 inventory masters only (no L2 inventory-master keys). */
const INVENTORY_ADMIN_L3_KEYS = new Set([
  'inventory-categories:inventory-categories:read',
  'inventory-uoms:inventory-uoms:read',
  'inventory-item-types:inventory-item-types:read',
  'inventory-storage-conditions:inventory-storage-conditions:read',
  'inventory-hsn-gst:inventory-hsn-gst:read',
  'inventory-store-types:inventory-store-types:read',
]);

describe('principalGrantsInventoryMasterTabAccess', () => {
  it('shows Item Master when the principal has any inventory L3 master capability', () => {
    expect(principalGrantsInventoryMasterTabAccess(INVENTORY_ADMIN_L3_KEYS, 'item-master')).toBe(
      true,
    );
  });

  it('shows only L3 tabs matching granted capabilities', () => {
    const visible = INVENTORY_MASTER_TABS.filter((tab) =>
      principalGrantsInventoryMasterTabAccess(INVENTORY_ADMIN_L3_KEYS, tab.id),
    ).map((tab) => tab.id);

    expect(visible).toContain('item-master');
    expect(visible).toContain('categories');
    expect(visible).toContain('item-types');
    expect(visible).not.toContain('manufacturers');
  });

  it('hides Item Master when no inventory master capabilities are granted', () => {
    expect(principalGrantsInventoryMasterTabAccess(new Set(), 'item-master')).toBe(false);
  });
});
