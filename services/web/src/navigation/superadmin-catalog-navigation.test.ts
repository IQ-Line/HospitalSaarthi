import { beforeEach, describe, expect, it } from 'vitest';
import {
  composeNavigationManifest,
  getRegisteredModuleManifests,
  registerBuiltinModuleManifests,
} from '@/platform/modules';
import {
  buildEnabledModuleSlugsFromCatalog,
  catalogSlugSetFromIndex,
} from '@/platform/modules/use-enabled-tenant-modules';
import { applyCatalogNavigationLabels } from './apply-catalog-navigation-labels';
import { DEV_CATALOG_L1_FIXTURE } from './dev-catalog-l1.fixture';
import { filterNavigationTree } from './filter-navigation-tree';
import { NAVIGATION_MANIFEST } from './navigation-manifest';
import { buildNavFilterContext } from './use-filtered-navigation';

describe('super-admin sidebar vs global_master.modules L1 catalog', () => {
  beforeEach(() => {
    registerBuiltinModuleManifests();
  });

  it('L1 catalog slugs match the seven product roots from dev seed (not L2/L3 rows)', () => {
    const l1Slugs = catalogSlugSetFromIndex(DEV_CATALOG_L1_FIXTURE);
    expect([...l1Slugs].sort()).toEqual(
      [
        'configurator',
        'empi',
        'frontdesk',
        'master-data',
        'master_data',
        'opd',
        'user-management',
        'user_management',
      ].sort(),
    );
    expect(l1Slugs.has('vaccines')).toBe(false);
  });

  it('shows only SPA modules backed by an L1 catalog slug (not empi/opd — no manifest)', () => {
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
    expect(ids).toContain('frontdesk');
    expect(ids).not.toContain('visitpad');
    expect(ids).toContain('configurator');
    expect(ids).not.toContain('empi');
    expect(ids).not.toContain('opd');
    expect(ids).not.toContain('vaccines');
  });

  it('hides product modules from super-admin navigation', () => {
    const manifest = composeNavigationManifest(getRegisteredModuleManifests());
    const filtered = filterNavigationTree(
      manifest,
      buildNavFilterContext(
        new Set(),
        catalogSlugSetFromIndex(DEV_CATALOG_L1_FIXTURE, { excludeProductModules: true }),
        {
          bypassCapabilityGates: true,
          isSuperAdmin: true,
          catalogIndex: DEV_CATALOG_L1_FIXTURE,
        },
      ),
    );

    const ids = filtered.map((n) => n.id);
    expect(ids).toContain('dashboard');
    expect(ids).toContain('master-data');
    expect(ids).toContain('user-management');
    expect(ids).toContain('configurator');
    expect(ids).not.toContain('frontdesk');
    expect(ids).not.toContain('opd');
  });

  it('keeps inventory masters / store config out of superadmin sidebar (tenant detail tabs)', () => {
    const manifest = composeNavigationManifest(getRegisteredModuleManifests());
    const homeOnly = buildEnabledModuleSlugsFromCatalog(
      catalogSlugSetFromIndex(DEV_CATALOG_L1_FIXTURE, { excludeProductModules: true }),
    );
    const homeNav = filterNavigationTree(
      manifest,
      buildNavFilterContext(new Set(), homeOnly, {
        bypassCapabilityGates: true,
        isSuperAdmin: true,
        catalogIndex: DEV_CATALOG_L1_FIXTURE,
      }),
    );
    expect(homeNav.map((n) => n.id)).not.toContain('inventory-supply-masters');
    expect(homeNav.map((n) => n.id)).not.toContain('store-configuration');

    // Even with admin enrichment available (tenant-admin path), superadmin facility
    // nav from L1+product merge intentionally omits sidebar shells — they live on
    // Onboarding → tenant detail tabs instead.
    const facilityEnabled = buildEnabledModuleSlugsFromCatalog(
      catalogSlugSetFromIndex(DEV_CATALOG_L1_FIXTURE, { excludeProductModules: true }),
    );
    const facilityNav = filterNavigationTree(
      manifest,
      buildNavFilterContext(new Set(), facilityEnabled, {
        bypassCapabilityGates: true,
        isSuperAdmin: true,
        catalogIndex: DEV_CATALOG_L1_FIXTURE,
      }),
    );
    const rootIds = facilityNav.map((n) => n.id);
    expect(rootIds).not.toContain('inventory-supply-masters');
    expect(rootIds).not.toContain('store-configuration');
    expect(rootIds).toContain('configurator');
    const onboarding = facilityNav.find((n) => n.id === 'configurator');
    expect(onboarding?.children?.map((c) => c.id) ?? []).not.toContain('inventory-supply-masters');
    expect(onboarding?.children?.map((c) => c.id) ?? []).not.toContain('store-configuration');
  });

  it('uses Master Data display name Onboarding for configurator slug', () => {
    const filtered = applyCatalogNavigationLabels(
      filterNavigationTree(
        NAVIGATION_MANIFEST,
        buildNavFilterContext(new Set(), catalogSlugSetFromIndex(DEV_CATALOG_L1_FIXTURE), {
          bypassCapabilityGates: true,
        }),
      ),
      DEV_CATALOG_L1_FIXTURE,
    );

    const configurator = filtered.find((n) => n.id === 'configurator');
    expect(configurator?.label).toBe('Onboarding');
  });

  it('Visitpad child Vaccines is nested under master-data → visitpad-master, not a sidebar root', () => {
    const manifest = composeNavigationManifest(getRegisteredModuleManifests());
    const filtered = filterNavigationTree(
      manifest,
      buildNavFilterContext(new Set(), catalogSlugSetFromIndex(DEV_CATALOG_L1_FIXTURE), {
        bypassCapabilityGates: true,
      }),
    );

    const visitpadMaster = filtered
      .find((n) => n.id === 'master-data')
      ?.children?.find((c) => c.id === 'visitpad-master');
    expect(visitpadMaster).toBeDefined();
    expect(visitpadMaster?.children?.some((c) => c.label === 'Vaccines')).toBe(true);
    expect(filtered.some((n) => n.id === 'vaccines')).toBe(false);
    expect(filtered.some((n) => n.id === 'visitpad')).toBe(false);
  });
});
