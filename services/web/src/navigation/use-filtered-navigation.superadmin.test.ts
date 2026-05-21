import { beforeEach, describe, expect, it } from 'vitest';
import { registerBuiltinModuleManifests } from '@/platform/modules';
import { catalogSlugSetFromIndex } from '@/platform/modules/use-enabled-tenant-modules';
import { DEV_CATALOG_L1_FIXTURE } from './dev-catalog-l1.fixture';
import { composeNavigationManifest, getRegisteredModuleManifests } from '@/platform/modules';
import { filterNavigationTree } from './filter-navigation-tree';
import { buildNavFilterContext } from './use-filtered-navigation';

describe('super-admin navigation (production bypass)', () => {
  beforeEach(() => {
    registerBuiltinModuleManifests();
  });

  it('shows product modules with empty capability keys when bypass is on', () => {
    const manifest = composeNavigationManifest(getRegisteredModuleManifests());
    const filtered = filterNavigationTree(
      manifest,
      buildNavFilterContext(new Set(), catalogSlugSetFromIndex(DEV_CATALOG_L1_FIXTURE), {
        bypassCapabilityGates: true,
      }),
    );

    const ids = filtered.map((n) => n.id);
    expect(ids).toContain('dashboard');
    expect(ids).toContain('master-data');
    expect(ids).toContain('user-management');
    expect(ids).toContain('visitpad');
    expect(ids).toContain('configurator');
  });
});
