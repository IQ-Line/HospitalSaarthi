import { describe, expect, it, beforeEach } from 'vitest';
import { FD_SHELL_ACCESS, MD_VISITPAD_VIEW, UM_USER_READ } from '@/lib/runtime-capability-keys';
import { filterNavigationTree } from '@/navigation/filter-navigation-tree';
import { buildNavCapabilityAccessInput } from '@/navigation/nav-capability-access';
import type { NavFilterContext } from '@/navigation/types';
import {
  clearModuleRegistryForTests,
  composeNavigationManifest,
  getRegisteredModuleManifests,
  invalidateComposedNavigationCache,
  manifestToNavigationNode,
  registerModuleManifest,
} from '../../../../src/platform/modules/index';
import { dashboardModuleManifest } from '../../../../src/platform/modules/manifests/dashboard.manifest';
import { masterDataModuleManifest } from '../../../../src/platform/modules/manifests/master-data.manifest';
import { userManagementModuleManifest } from '../../../../src/platform/modules/manifests/user-management.manifest';
import { visitpadModuleManifest } from '../../../../src/platform/modules/manifests/visitpad.manifest';
import { registerBuiltinModuleManifests } from '../../../../src/platform/modules/register-builtin-modules';

function ctx(
  partial: Partial<NavFilterContext> & { capabilityKeys?: ReadonlySet<string> },
): NavFilterContext {
  const hasCapability = partial.hasCapability ?? (() => false);
  const bypassCapabilityGates = partial.bypassCapabilityGates === true;
  const capabilityKeys =
    partial.capabilityKeys ??
    new Set([UM_USER_READ, MD_VISITPAD_VIEW].filter((key) => hasCapability(key)));

  const hasAnyCapabilityForProduct = partial.hasAnyCapabilityForProduct;

  return {
    hasCapability: (key) => bypassCapabilityGates || hasCapability(key),
    hasAnyCapability:
      partial.hasAnyCapability ?? ((keys) => keys.some((key) => hasCapability(key))),
    hasAllCapabilities:
      partial.hasAllCapabilities ?? ((keys) => keys.every((key) => hasCapability(key))),
    enabledModuleSlugs: partial.enabledModuleSlugs ?? null,
    bypassCapabilityGates,
    hasAnyCapabilityForProduct,
    navAccess:
      partial.navAccess ??
      buildNavCapabilityAccessInput(
        capabilityKeys,
        null,
        bypassCapabilityGates,
        hasAnyCapabilityForProduct,
      ),
  };
}

describe('module registry', () => {
  beforeEach(() => {
    clearModuleRegistryForTests();
    invalidateComposedNavigationCache();
  });

  it('registers built-in manifests with unique slugs', () => {
    registerBuiltinModuleManifests();
    const manifests = getRegisteredModuleManifests();
    const slugs = new Set(manifests.map((m) => m.slug));
    expect(slugs.size).toBe(manifests.length);
    expect(slugs.has('dashboard')).toBe(true);
    expect(slugs.has('user-management')).toBe(true);
    expect(slugs.has('configurator')).toBe(true);
    expect(slugs.has('master-data')).toBe(true);
    expect(slugs.has('frontdesk')).toBe(true);
  });

  it('maps visitpad nav to visitpad-master catalog slug (not visitpad)', () => {
    registerBuiltinModuleManifests();
    const visitpad = getRegisteredModuleManifests().find((m) => m.slug === 'visitpad');
    expect(visitpad?.requiredModulesAny).toEqual(['master-data', 'visitpad-master']);
  });

  it('nests visitpad catalog under master-data when both manifests are composed', () => {
    const tree = composeNavigationManifest([
      dashboardModuleManifest,
      masterDataModuleManifest,
      visitpadModuleManifest,
    ]);
    expect(tree.map((n) => n.id)).not.toContain('visitpad');
    const visitpadMaster = tree
      .find((n) => n.id === 'master-data')
      ?.children?.find((c) => c.id === 'visitpad-master');
    expect(visitpadMaster?.children?.length).toBeGreaterThan(5);
  });

  it('manifestToNavigationNode applies tenant module gate', () => {
    const node = manifestToNavigationNode(userManagementModuleManifest);
    expect(node.requiredModulesAny).toEqual(['user-management']);
  });

  it('filters composed tree by catalog slug enablement (no static UUID map)', () => {
    registerBuiltinModuleManifests();
    const manifest = composeNavigationManifest(getRegisteredModuleManifests());

    const capabilityKeys = new Set([UM_USER_READ]);
    const filtered = filterNavigationTree(
      manifest,
      ctx({
        capabilityKeys,
        hasCapability: (key) => capabilityKeys.has(key),
        enabledModuleSlugs: new Set(['user-management']),
      }),
    );
    expect(filtered.map((n) => n.id)).toContain('user-management');
    expect(filtered.map((n) => n.id)).not.toContain('visitpad');
  });

  it('frontdesk hidden when only master-data slug enabled (no inference)', () => {
    registerBuiltinModuleManifests();
    const manifest = composeNavigationManifest(getRegisteredModuleManifests());

    const filtered = filterNavigationTree(
      manifest,
      ctx({
        hasCapability: (key) => key === FD_SHELL_ACCESS,
        enabledModuleSlugs: new Set(['master-data']),
      }),
    );
    expect(filtered.map((n) => n.id)).not.toContain('frontdesk');
  });

  it('visitpad catalog visible under master-data when principal has L2 keys', () => {
    registerBuiltinModuleManifests();
    const manifest = composeNavigationManifest(getRegisteredModuleManifests());

    const capabilityKeys = new Set([MD_VISITPAD_VIEW, 'allergens:allergens:read']);
    const filtered = filterNavigationTree(
      manifest,
      ctx({
        capabilityKeys,
        hasCapability: (key) => capabilityKeys.has(key),
        hasAnyCapabilityForProduct: (slugs) =>
          slugs.includes('master-data') || slugs.includes('visitpad-master'),
        enabledModuleSlugs: new Set(['master-data']),
      }),
    );
    expect(filtered.map((n) => n.id)).toContain('master-data');
    const visitpadChildren =
      filtered
        .find((n) => n.id === 'master-data')
        ?.children?.find((c) => c.id === 'visitpad-master')?.children ?? [];
    expect(visitpadChildren.map((c) => c.id)).toContain('visitpad-allergens');
  });

  it('plugin module can register without editing navigation-manifest.ts', () => {
    registerModuleManifest({
      slug: 'billing',
      name: 'Billing',
      icon: 'receipt',
      routePrefix: '/billing',
      sortOrder: 25,
      navigation: [{ id: 'billing', label: 'Billing', icon: 'receipt', route: '/billing' }],
    });
    invalidateComposedNavigationCache();
    const tree = composeNavigationManifest(getRegisteredModuleManifests());
    expect(tree.some((n) => n.id === 'billing')).toBe(true);
  });
});
