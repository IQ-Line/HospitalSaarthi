import { describe, expect, it } from 'vitest';
import { MD_VISITPAD_CREATE, MD_VISITPAD_VIEW } from '../../../src/lib/runtime-capability-keys';
import { catalogModuleCrudAccess } from '../../../src/lib/catalog-module-crud-access';

/** Subset of role `ntn` without registration create (matches reported principal). */
const NTN_FRONTDESK_KEYS = new Set([
  'registration:registration:read',
  'registration:registration:update',
  'registration:registration:delete',
  'frontdesk:shell:access',
]);

const NTN_TARIFF_KEYS = new Set([
  'tariff-master:tariff-master:read',
  'tariff-master:tariff-master:update',
  'tariff-master:tariff-master:delete',
  'billing-and-finance:shell:access',
]);

describe('catalogModuleCrudAccess', () => {
  it('does not treat update, delete, or product shell as create', () => {
    const tariff = catalogModuleCrudAccess(NTN_TARIFF_KEYS, 'tariff-master', {
      productModuleSlug: 'billing-and-finance',
    });
    expect(tariff.canRead).toBe(true);
    expect(tariff.canCreate).toBe(false);
    expect(tariff.canUpdate).toBe(true);
    expect(tariff.canDelete).toBe(true);
    expect(tariff.canMutate).toBe(true);
  });

  it('does not treat registration update or frontdesk shell as create', () => {
    const registration = catalogModuleCrudAccess(NTN_FRONTDESK_KEYS, 'registration', {
      productModuleSlug: 'frontdesk',
    });
    expect(registration.canRead).toBe(true);
    expect(registration.canCreate).toBe(false);
    expect(registration.canUpdate).toBe(true);
    expect(registration.canDelete).toBe(true);
  });

  it('grants registration list read when desk staff has create only', () => {
    const createOnly = new Set([
      'registration:registration:create',
      'frontdesk:shell:access',
    ]);
    const registration = catalogModuleCrudAccess(createOnly, 'registration', {
      productModuleSlug: 'frontdesk',
    });
    expect(registration.canRead).toBe(true);
    expect(registration.canCreate).toBe(true);
  });

  it('requires explicit create for add actions', () => {
    const keys = new Set(['allergens:allergens:update']);
    const access = catalogModuleCrudAccess(keys, 'allergens');
    expect(access.canCreate).toBe(false);
    expect(access.canUpdate).toBe(true);
  });

  it('grants visitpad L3 CRUD from visitpad-master shell keys (demo tenant-admin seed)', () => {
    const shellOnly = new Set([MD_VISITPAD_VIEW, MD_VISITPAD_CREATE]);
    const units = catalogModuleCrudAccess(shellOnly, 'units');
    expect(units.canRead).toBe(true);
    expect(units.canCreate).toBe(true);
    expect(units.canUpdate).toBe(true);
    expect(units.canDelete).toBe(true);
    expect(units.canMutate).toBe(true);
  });

  it('does not apply visitpad shell fallback to non-visitpad catalog modules', () => {
    const shellOnly = new Set([MD_VISITPAD_VIEW, MD_VISITPAD_CREATE]);
    const users = catalogModuleCrudAccess(shellOnly, 'users');
    expect(users.canRead).toBe(false);
    expect(users.canCreate).toBe(false);
  });

  it('grants departments CRUD from visitpad-master shell keys (tenant-admin parity)', () => {
    const shellOnly = new Set([MD_VISITPAD_VIEW, MD_VISITPAD_CREATE]);
    const departments = catalogModuleCrudAccess(shellOnly, 'departments');
    expect(departments.canRead).toBe(true);
    expect(departments.canCreate).toBe(true);
    expect(departments.canUpdate).toBe(true);
    expect(departments.canDelete).toBe(true);
  });

  it('grants Item Master CRUD from any inventory L3 master create capability', () => {
    const l3CreateOnly = new Set(['inventory-categories:inventory-categories:create']);
    const itemMaster = catalogModuleCrudAccess(l3CreateOnly, 'inventory-master', {
      productModuleSlug: 'inventory-master',
    });
    expect(itemMaster.canCreate).toBe(true);
    expect(itemMaster.canMutate).toBe(true);
    expect(itemMaster.canUpdate).toBe(false);
    expect(itemMaster.canDelete).toBe(false);
  });

  it('does not grant Item Master create from L3 read-only capabilities', () => {
    const l3ReadOnly = new Set([
      'inventory-categories:inventory-categories:read',
      'inventory-item-types:inventory-item-types:read',
    ]);
    const itemMaster = catalogModuleCrudAccess(l3ReadOnly, 'inventory-master', {
      productModuleSlug: 'inventory-master',
    });
    expect(itemMaster.canCreate).toBe(false);
    expect(itemMaster.canRead).toBe(true);
  });
});
