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
} from './index';
import { dashboardModuleManifest } from './manifests/dashboard.manifest';
import { userManagementModuleManifest } from './manifests/user-management.manifest';
import { visitpadModuleManifest } from './manifests/visitpad.manifest';
import { registerBuiltinModuleManifests } from './register-builtin-modules';

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

  it('maps visitpad nav to visitpad-templates catalog slug (not visitpad)', () => {
    registerBuiltinModuleManifests();
    const visitpad = getRegisteredModuleManifests().find((m) => m.slug === 'visitpad');
    expect(visitpad?.requiredModulesAny).toEqual(['visitpad-templates']);
  });

  it('composes dashboard leaf and grouped visitpad module', () => {
    const tree = composeNavigationManifest([dashboardModuleManifest, visitpadModuleManifest]);
    expect(tree).toHaveLength(2);
    expect(tree[0].id).toBe('dashboard');
    expect(tree[0].route).toBe('/dashboard');
    expect(tree[1].id).toBe('visitpad');
    expect(tree[1].children?.length).toBeGreaterThan(5);
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

  it('visitpad visible when visitpad-templates slug enabled', () => {
    registerBuiltinModuleManifests();
    const manifest = composeNavigationManifest(getRegisteredModuleManifests());

    const capabilityKeys = new Set([MD_VISITPAD_VIEW]);
    const filtered = filterNavigationTree(
      manifest,
      ctx({
        capabilityKeys,
        hasCapability: (key) => capabilityKeys.has(key),
        hasAnyCapabilityForProduct: (slugs) => slugs.includes('visitpad-templates'),
        enabledModuleSlugs: new Set(['visitpad-templates']),
      }),
    );
    expect(filtered.map((n) => n.id)).toContain('visitpad');
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
