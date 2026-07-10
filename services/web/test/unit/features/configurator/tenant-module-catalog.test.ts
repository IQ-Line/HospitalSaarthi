import { describe, expect, it } from 'vitest';
import type { Module } from '@/features/master-data/types';
import { filterCatalogL1Modules, isCatalogL1Module } from '../../../../src/features/configurator/tenant-module-catalog';

function module(partial: Partial<Module> & Pick<Module, 'id' | 'name' | 'slug'>): Module {
  return {
    parent_id: null,
    description: null,
    category: 'core',
    version: '1.0.0',
    level: 1,
    icon: null,
    is_active: true,
    is_deleted: false,
    created_by: null,
    updated_by: null,
    created_at: '',
    updated_at: '',
    ...partial,
  };
}

describe('tenant-module-catalog', () => {
  it('identifies L1 roots only', () => {
    expect(isCatalogL1Module(module({ id: '1', name: 'A', slug: 'a', level: 1 }))).toBe(true);
    expect(
      isCatalogL1Module(
        module({ id: '2', name: 'B', slug: 'b', level: 2, parent_id: '1' }),
      ),
    ).toBe(false);
  });

  it('filters deleted and child modules', () => {
    const roots = filterCatalogL1Modules([
      module({ id: '1', name: 'Billing', slug: 'billing-and-finance', display_order: 120 }),
      module({ id: '2', name: 'Invoice', slug: 'invoice', level: 2, parent_id: '1' }),
      module({ id: '3', name: 'Gone', slug: 'gone', is_deleted: true }),
    ]);
    expect(roots.map((m) => m.slug)).toEqual(['billing-and-finance']);
  });
});
