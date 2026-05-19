import { describe, expect, it, beforeEach } from 'vitest';
import { MD_VISITPAD_VIEW, UM_USER_READ } from '@/lib/runtime-capability-keys';
import { filterNavigationTree } from '@/navigation/filter-navigation-tree';
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

function ctx(partial: Partial<NavFilterContext>): NavFilterContext {
  const hasCapability = partial.hasCapability ?? (() => false);
  return {
    hasCapability,
    hasAnyCapability:
      partial.hasAnyCapability ?? ((keys) => keys.some((key) => hasCapability(key))),
    hasAllCapabilities:
      partial.hasAllCapabilities ?? ((keys) => keys.every((key) => hasCapability(key))),
    enabledModuleSlugs: partial.enabledModuleSlugs ?? null,
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
    expect(node.requiredModules).toEqual(['user-management']);
  });

  it('filters composed tree by catalog slug enablement (no static UUID map)', () => {
    registerBuiltinModuleManifests();
    const manifest = composeNavigationManifest(getRegisteredModuleManifests());

    const filtered = filterNavigationTree(
      manifest,
      ctx({
        hasCapability: (key) => key === UM_USER_READ,
        enabledModuleSlugs: new Set(['user-management']),
      }),
    );
    expect(filtered.map((n) => n.id)).toContain('user-management');
    expect(filtered.map((n) => n.id)).not.toContain('visitpad');
  });

  it('visitpad visible when visitpad-templates slug enabled', () => {
    registerBuiltinModuleManifests();
    const manifest = composeNavigationManifest(getRegisteredModuleManifests());

    const filtered = filterNavigationTree(
      manifest,
      ctx({
        hasCapability: (key) => key === MD_VISITPAD_VIEW,
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
