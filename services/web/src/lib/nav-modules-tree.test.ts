import { describe, expect, it } from 'vitest';
import type { NavModule } from '@/features/master-data/types';
import { buildNavModuleTree, formatModuleNavLabel } from './nav-modules-tree';

function module(overrides: Partial<NavModule> & Pick<NavModule, 'id' | 'slug' | 'name'>): NavModule {
  return {
    iq_tenant_id: null,
    parent_id: null,
    category: 'core',
    level: 1,
    icon: null,
    ...overrides,
  };
}

describe('buildNavModuleTree', () => {
  it('nests children by parent_id and resolves paths', () => {
    const flat: NavModule[] = [
      module({ id: 'md', slug: 'master-data', name: 'Master Data', level: 1 }),
      module({
        id: 'mods',
        slug: 'modules',
        name: 'Modules',
        parent_id: 'md',
        level: 2,
      }),
      module({
        id: 'vp-master',
        slug: 'visitpad-master',
        name: 'Visitpad Master',
        parent_id: 'md',
        level: 2,
      }),
      module({
        id: 'units',
        slug: 'units',
        name: 'Units',
        parent_id: 'vp-master',
        level: 3,
      }),
      module({
        id: 'conversions',
        slug: 'unit-conversions',
        name: 'Unit conversions',
        parent_id: 'vp-master',
        level: 3,
      }),
    ];

    const tree = buildNavModuleTree(flat);
    expect(tree).toHaveLength(1);

    const master = tree.find((n) => n.module.slug === 'master-data');
    expect(master?.children.find((c) => c.module.slug === 'modules')?.path).toBe(
      '/master-data/modules',
    );

    const visitpadMaster = master?.children.find((c) => c.module.slug === 'visitpad-master');
    expect(visitpadMaster?.path).toBe('/visitpad');
    expect(visitpadMaster?.children.find((c) => c.module.slug === 'units')?.path).toBe(
      '/visitpad/units',
    );
    expect(visitpadMaster?.children.find((c) => c.module.slug === 'unit-conversions')?.path).toBe(
      '/visitpad/unit-conversions',
    );
  });

  it('formatModuleNavLabel title-cases underscored names', () => {
    expect(formatModuleNavLabel('user_management')).toBe('User Management');
  });
});
