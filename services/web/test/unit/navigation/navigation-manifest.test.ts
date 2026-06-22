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
} from '../../../src/navigation/filter-navigation-tree';
import { buildNavCapabilityAccessInput } from '../../../src/navigation/nav-capability-access';
import { NAVIGATION_MANIFEST } from '../../../src/navigation/navigation-manifest';
import type { NavFilterContext } from '../../../src/navigation/types';

function ctx(partial: Partial<NavFilterContext> & { capabilityKeys?: ReadonlySet<string> }): NavFilterContext {
  const hasCapability = partial.hasCapability ?? (() => false);
  const bypassCapabilityGates = partial.bypassCapabilityGates === true;
  const capabilityKeys =
    partial.capabilityKeys ??
    new Set(
      bypassCapabilityGates
        ? []
        : ['users:users:read', 'allergens:allergens:read', 'modules:modules:read'].filter((key) =>
            hasCapability(key),
          ),
    );

  const hasAnyCapabilityForProduct = partial.hasAnyCapabilityForProduct;

  const navAccess =
    partial.navAccess ??
    buildNavCapabilityAccessInput(
      capabilityKeys,
      null,
      bypassCapabilityGates,
      hasAnyCapabilityForProduct,
    );

  if (partial.hasAllCapabilities && !partial.navAccess) {
    navAccess.hasAllCapabilities = partial.hasAllCapabilities;
  }
  if (partial.hasAnyCapability && !partial.navAccess) {
    navAccess.hasAnyCapability = partial.hasAnyCapability;
  }

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
    hasAnyCapabilityForProduct,
    navAccess,
  };
}

function visitpadMasterGroup(nodes: readonly { id: string; children?: readonly { id: string }[] }[]) {
  const masterData = nodes.find((n) => n.id === 'master-data');
  return masterData?.children?.find((c) => c.id === 'visitpad-master');
}

describe('NAVIGATION_MANIFEST', () => {
  it('nests visitpad catalog leaves under master-data → visitpad-master', () => {
    expect(NAVIGATION_MANIFEST.length).toBeGreaterThan(0);
    expect(NAVIGATION_MANIFEST.find((n) => n.id === 'visitpad')).toBeUndefined();
    const visitpadMaster = visitpadMasterGroup(NAVIGATION_MANIFEST);
    expect(visitpadMaster?.children?.length).toBeGreaterThan(5);
    expect(visitpadMaster?.children?.[0]?.route).toMatch(/^\/visitpad\//);
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

  it('shows user-management when principal has L2 users:* keys', () => {
    const capabilityKeys = new Set(['users:users:read']);
    const filtered = filterNavigationTree(
      NAVIGATION_MANIFEST,
      ctx({
        capabilityKeys,
        hasCapability: (key) => capabilityKeys.has(key),
        hasAnyCapabilityForProduct: (slugs) => slugs.includes('user-management'),
        enabledModuleSlugs: new Set(['user-management', 'users']),
      }),
    );
    expect(filtered.map((n) => n.id)).toContain('user-management');
    const umChildren = filtered.find((n) => n.id === 'user-management')?.children ?? [];
    expect(umChildren.map((c) => c.id)).toContain('user-management-users');
  });

  it('filters visitpad by L2 catalog keys and visitpad-master tenant module', () => {
    const capabilityKeys = new Set(['allergens:allergens:read', 'vitals:vitals:read']);
    const filtered = filterNavigationTree(
      NAVIGATION_MANIFEST,
      ctx({
        capabilityKeys,
        hasCapability: (key) => capabilityKeys.has(key),
        hasAnyCapabilityForProduct: (slugs) =>
          slugs.includes('master-data') || slugs.includes('visitpad-master'),
        enabledModuleSlugs: new Set(['master-data']),
      }),
    );
    expect(filtered.map((n) => n.id)).toContain('master-data');
    const visitpadChildren = visitpadMasterGroup(filtered)?.children ?? [];
    expect(visitpadChildren.map((c) => c.id)).toContain('visitpad-allergens');
    expect(visitpadChildren.map((c) => c.id)).toContain('visitpad-vitals');
    expect(visitpadChildren.map((c) => c.id)).not.toContain('visitpad-conversions');
  });

  it('hides visitpad catalog leaves when principal holds only visitpad:view shell (no L2 keys)', () => {
    const filtered = filterNavigationTree(
      NAVIGATION_MANIFEST,
      ctx({
        hasCapability: (key) => key === MD_VISITPAD_VIEW,
        capabilityKeys: new Set([MD_VISITPAD_VIEW]),
        hasAnyCapabilityForProduct: (slugs) =>
          slugs.includes('master-data') || slugs.includes('visitpad-master'),
        enabledModuleSlugs: new Set(['master-data']),
      }),
    );
    const visitpadChildren = visitpadMasterGroup(filtered)?.children ?? [];
    expect(visitpadChildren).toHaveLength(0);
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
        capabilityKeys: new Set(),
        hasCapability: () => false,
        enabledModuleSlugs: new Set(['configurator']),
      }),
    );
    expect(filtered.map((n) => n.id)).not.toContain('configurator');
  });

  it('shows configurator when tenant-modules capability is held', () => {
    const capabilityKeys = new Set(['tenant-modules:tenant-modules:read']);
    const filtered = filterNavigationTree(
      NAVIGATION_MANIFEST,
      ctx({
        capabilityKeys,
        hasCapability: (key) => capabilityKeys.has(key),
        enabledModuleSlugs: new Set(['configurator']),
      }),
    );
    expect(filtered.map((n) => n.id)).toContain('configurator');
  });

  it('hides configurator when only shell capability is held (no L2 catalog key)', () => {
    const capabilityKeys = new Set([CFG_SHELL_ACCESS]);
    const filtered = filterNavigationTree(
      NAVIGATION_MANIFEST,
      ctx({
        capabilityKeys,
        hasCapability: (key) => capabilityKeys.has(key),
        enabledModuleSlugs: new Set(['configurator']),
      }),
    );
    expect(filtered.map((n) => n.id)).not.toContain('configurator');
  });

  it('shows configurator for platform super-admin when tenant module is enabled (test bypass only)', () => {
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

  it('still hides configurator for super-admin when module slug is absent from catalog', () => {
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

  it('shows modules only when principal holds matching L2 keys (no role bypass)', () => {
    const capabilityKeys = new Set([
      'modules:modules:read',
      'allergens:allergens:read',
    ]);
    const filtered = filterNavigationTree(
      NAVIGATION_MANIFEST,
      ctx({
        capabilityKeys,
        hasCapability: (key) => capabilityKeys.has(key),
        enabledModuleSlugs: new Set(['master-data', 'visitpad-master']),
      }),
    );
    const ids = filtered.map((n) => n.id);
    expect(ids).toContain('dashboard');
    expect(ids).toContain('master-data');
    expect(ids).not.toContain('visitpad');
    expect(visitpadMasterGroup(filtered)?.children?.map((c) => c.id)).toContain('visitpad-allergens');
    expect(ids).not.toContain('user-management');
    expect(ids).not.toContain('configurator');
    expect(ids).not.toContain('frontdesk');
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

  it('shows master-data modules route for modules:modules:read without shell key', () => {
    const capabilityKeys = new Set(['modules:modules:read']);
    expect(
      isNavigationNodeVisible(
        {
          id: 'master-data-modules',
          label: 'Modules',
          route: '/master-data/modules',
        },
        ctx({
          capabilityKeys,
          hasCapability: (key) => capabilityKeys.has(key),
          enabledModuleSlugs: new Set(['master-data']),
        }),
        { parentProductSlugs: ['master-data'] },
      ),
    ).toBe(true);
  });
});

describe('collectModuleDiscoveryEntries', () => {
  it('returns one entry per top-level module with a route', () => {
    const capabilityKeys = new Set([
      UM_USER_READ,
      'allergens:allergens:read',
      'modules:modules:read',
      'tenant-modules:tenant-modules:read',
      'opd:patient:read',
    ]);
    const filtered = filterNavigationTree(
      NAVIGATION_MANIFEST,
      ctx({
        capabilityKeys,
        hasCapability: (key) => capabilityKeys.has(key),
        enabledModuleSlugs: new Set([
          'user-management',
          'master-data',
          'visitpad-master',
          'configurator',
          'frontdesk',
        ]),
      }),
    );
    const discovery = collectModuleDiscoveryEntries(filtered);
    expect(discovery.map((d) => d.id)).toContain('user-management');
    expect(discovery.map((d) => d.id)).toContain('master-data');
    expect(discovery.map((d) => d.id)).not.toContain('visitpad');
    expect(discovery.every((d) => d.route?.startsWith('/'))).toBe(true);
    expect(discovery.find((d) => d.id === 'dashboard')).toBeUndefined();
  });
});
