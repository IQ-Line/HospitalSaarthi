import { describe, expect, it } from 'vitest';
import type { Capability } from '../types';
import {
  capabilityBelongsToInventoryModule,
  capabilityBelongsToPharmacyModule,
  resolveRoleTemplateCapabilityIdsForCreate,
  willGrantInventoryCapabilities,
  willGrantPharmacyCapabilities,
  willGrantStoreScopedCapabilities,
} from './is-pharmacy-capability-selected';

const PHARMACY_SHELL: Capability = {
  id: 'pharmacy-shell-id',
  capability_key: 'pharmacy:shell:access',
  module: 'pharmacy',
  feature: 'shell',
  action: 'access',
  display_name: 'Pharmacy shell',
  is_active: true,
};

const DISPENSE_READ: Capability = {
  id: 'dispense-read-id',
  capability_key: 'dispense:dispense:read',
  module: 'dispense',
  feature: 'dispense',
  action: 'read',
  display_name: 'Dispense read',
  is_active: true,
  source_module_slug: 'dispense',
};

const INVENTORY_STOCK: Capability = {
  id: 'inventory-stock-id',
  capability_key: 'inventory-stock:stock:read',
  module: 'inventory-stock',
  feature: 'stock',
  action: 'read',
  display_name: 'Inventory stock read',
  is_active: true,
  source_module_slug: 'inventory-stock',
};

const INVENTORY_MASTER: Capability = {
  id: 'inventory-master-id',
  capability_key: 'inventory-master:inventory-master:read',
  module: 'inventory-master',
  feature: 'inventory-master',
  action: 'read',
  display_name: 'Inventory master read',
  is_active: true,
  source_module_slug: 'inventory-master',
};

describe('capabilityBelongsToPharmacyModule', () => {
  it('matches pharmacy shell and dispense runtime keys', () => {
    expect(capabilityBelongsToPharmacyModule(PHARMACY_SHELL)).toBe(true);
    expect(capabilityBelongsToPharmacyModule(DISPENSE_READ)).toBe(true);
  });
});

describe('capabilityBelongsToInventoryModule', () => {
  it('matches inventory operational and master module slugs', () => {
    expect(capabilityBelongsToInventoryModule(INVENTORY_STOCK)).toBe(true);
    expect(capabilityBelongsToInventoryModule(INVENTORY_MASTER)).toBe(true);
    expect(capabilityBelongsToInventoryModule(PHARMACY_SHELL)).toBe(false);
  });
});

describe('resolveRoleTemplateCapabilityIdsForCreate', () => {
  it('always sends explicit ids for a single role (even when the catalog is empty)', () => {
    expect(
      resolveRoleTemplateCapabilityIdsForCreate([], true, ['role-id'], []),
    ).toEqual([]);
  });

  it('falls back to all role capabilities when selection is empty but catalog is known', () => {
    expect(
      resolveRoleTemplateCapabilityIdsForCreate([], true, ['role-id'], ['cap-a', 'cap-b']),
    ).toEqual(['cap-a', 'cap-b']);
  });
});

describe('willGrantPharmacyCapabilities', () => {
  it('is true when dispense permissions are in the resolved grant set', () => {
    expect(
      willGrantPharmacyCapabilities(
        [DISPENSE_READ],
        [DISPENSE_READ.id],
        true,
        ['role-id'],
        [DISPENSE_READ.id],
      ),
    ).toBe(true);
  });
});

describe('willGrantInventoryCapabilities / willGrantStoreScopedCapabilities', () => {
  it('requires store access for inventory operational capabilities', () => {
    expect(
      willGrantInventoryCapabilities(
        [INVENTORY_STOCK],
        [INVENTORY_STOCK.id],
        true,
        ['role-id'],
        [INVENTORY_STOCK.id],
      ),
    ).toBe(true);
    expect(
      willGrantStoreScopedCapabilities(
        [INVENTORY_STOCK],
        [INVENTORY_STOCK.id],
        true,
        ['role-id'],
        [INVENTORY_STOCK.id],
      ),
    ).toBe(true);
  });
});
