import { describe, expect, it } from 'vitest';
import {
  CFG_SHELL_ACCESS,
  FD_SHELL_ACCESS,
  MD_SHELL_ACCESS,
  MD_VISITPAD_VIEW,
  UM_USER_READ,
} from '@/lib/runtime-capability-keys';
import {
  collectModuleDiscoveryEntries,
  filterNavigationTree,
  isNavigationNodeVisible,
} from './filter-navigation-tree';
import { NAVIGATION_MANIFEST } from './navigation-manifest';
import type { NavFilterContext } from './types';

function ctx(partial: Partial<NavFilterContext>): NavFilterContext {
  const hasCapability = partial.hasCapability ?? (() => false);
  const bypassCapabilityGates = partial.bypassCapabilityGates === true;
  return {
    hasCapability: (key) => bypassCapabilityGates || hasCapability(key),
    hasAnyCapability:
      partial.hasAnyCapability ??
      ((keys) => bypassCapabilityGates || keys.some((key) => hasCapability(key))),
    hasAllCapabilities:
      partial.hasAllCapabilities ??
      ((keys) => bypassCapabilityGates || keys.every((key) => hasCapability(key))),
    enabledModuleSlugs: partial.enabledModuleSlugs ?? null,
    bypassCapabilityGates,
  };
}

describe('NAVIGATION_MANIFEST', () => {
  it('is a tree of NavigationNode metadata', () => {
    expect(NAVIGATION_MANIFEST.length).toBeGreaterThan(0);
    const visitpad = NAVIGATION_MANIFEST.find((n) => n.id === 'visitpad');
    expect(visitpad?.children?.length).toBeGreaterThan(5);
    expect(visitpad?.children?.[0]?.route).toMatch(/^\/visitpad\//);
  });

  it('every node has id and label', () => {
    const walk = (nodes: typeof NAVIGATION_MANIFEST) => {
      for (const node of nodes) {
        expect(node.id).toBeTruthy();
        expect(node.label).toBeTruthy();
        if (node.children) walk(node.children);
      }
    };
    walk(NAVIGATION_MANIFEST);
  });
});

describe('filterNavigationTree', () => {
  it('always includes dashboard without capabilities', () => {
    const filtered = filterNavigationTree(NAVIGATION_MANIFEST, ctx({}));
    expect(filtered.map((n) => n.id)).toContain('dashboard');
  });

  it('filters visitpad by capability and visitpad-templates tenant module', () => {
    const filtered = filterNavigationTree(
      NAVIGATION_MANIFEST,
      ctx({
        hasCapability: (key) => key === MD_VISITPAD_VIEW,
        enabledModuleSlugs: new Set(['visitpad-templates']),
      }),
    );
    expect(filtered.map((n) => n.id)).toContain('visitpad');
    expect(filtered.find((n) => n.id === 'visitpad')?.children?.length).toBeGreaterThan(0);
  });

  it('does not show visitpad when only master-data is enabled', () => {
    const filtered = filterNavigationTree(
      NAVIGATION_MANIFEST,
      ctx({
        hasCapability: (key) => key === MD_VISITPAD_VIEW,
        enabledModuleSlugs: new Set(['master-data']),
      }),
    );
    expect(filtered.map((n) => n.id)).not.toContain('visitpad');
  });

  it('hides tenant-gated modules while tenant_modules are unresolved', () => {
    const filtered = filterNavigationTree(
      NAVIGATION_MANIFEST,
      ctx({
        hasCapability: (key) => key === UM_USER_READ,
        enabledModuleSlugs: null,
      }),
    );
    expect(filtered.map((n) => n.id)).toContain('dashboard');
    expect(filtered.map((n) => n.id)).not.toContain('user-management');
  });

  it('hides user-management when tenant module disabled', () => {
    const filtered = filterNavigationTree(
      NAVIGATION_MANIFEST,
      ctx({
        hasCapability: (key) => key === UM_USER_READ,
        enabledModuleSlugs: new Set(['opd']),
      }),
    );
    expect(filtered.map((n) => n.id)).not.toContain('user-management');
  });

  it('prunes empty groups when all children are denied', () => {
    const filtered = filterNavigationTree(
      NAVIGATION_MANIFEST,
      ctx({
        hasCapability: () => false,
        enabledModuleSlugs: new Set(['configurator']),
      }),
    );
    expect(filtered.map((n) => n.id)).not.toContain('configurator');
  });

  it('shows configurator when shell capability is held', () => {
    const filtered = filterNavigationTree(
      NAVIGATION_MANIFEST,
      ctx({
        hasCapability: (key) => key === CFG_SHELL_ACCESS,
        enabledModuleSlugs: new Set(['configurator']),
      }),
    );
    expect(filtered.map((n) => n.id)).toContain('configurator');
  });

  it('shows configurator for platform super-admin when tenant module is enabled (no shell cap on principal)', () => {
    const filtered = filterNavigationTree(
      NAVIGATION_MANIFEST,
      ctx({
        hasCapability: () => false,
        enabledModuleSlugs: new Set(['configurator']),
        bypassCapabilityGates: true,
      }),
    );
    expect(filtered.map((n) => n.id)).toContain('configurator');
  });

  it('still hides configurator for super-admin when tenant module is disabled', () => {
    const filtered = filterNavigationTree(
      NAVIGATION_MANIFEST,
      ctx({
        hasCapability: () => true,
        enabledModuleSlugs: new Set(['user-management']),
        bypassCapabilityGates: true,
      }),
    );
    expect(filtered.map((n) => n.id)).not.toContain('configurator');
  });
});

describe('isNavigationNodeVisible', () => {
  it('requires all capabilities when requiredCapabilitiesAll is set', () => {
    const node = {
      id: 'test',
      label: 'Test',
      requiredCapabilitiesAll: ['a', 'b'],
    };
    expect(
      isNavigationNodeVisible(
        node,
        ctx({
          hasAllCapabilities: (keys) => keys.length === 2,
        }),
      ),
    ).toBe(true);
    expect(
      isNavigationNodeVisible(
        node,
        ctx({
          hasAllCapabilities: () => false,
        }),
      ),
    ).toBe(false);
  });
});

describe('collectModuleDiscoveryEntries', () => {
  it('returns one entry per top-level module with a route', () => {
    const filtered = filterNavigationTree(
      NAVIGATION_MANIFEST,
      ctx({
        hasCapability: (key) =>
          [UM_USER_READ, MD_VISITPAD_VIEW, MD_SHELL_ACCESS, CFG_SHELL_ACCESS, FD_SHELL_ACCESS].includes(
            key,
          ),
        enabledModuleSlugs: new Set([
          'user-management',
          'master-data',
          'visitpad-templates',
          'configurator',
          'frontdesk',
        ]),
      }),
    );
    const discovery = collectModuleDiscoveryEntries(filtered);
    expect(discovery.map((d) => d.id)).toContain('user-management');
    expect(discovery.map((d) => d.id)).toContain('visitpad');
    expect(discovery.every((d) => d.route?.startsWith('/'))).toBe(true);
    expect(discovery.find((d) => d.id === 'dashboard')).toBeUndefined();
  });
});
