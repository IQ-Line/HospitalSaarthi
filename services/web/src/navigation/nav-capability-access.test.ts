import { describe, expect, it } from 'vitest';
import {
  buildNavCapabilityAccessInput,
  buildPrincipalCapabilityModuleSegments,
  capabilityKeysGrantModuleSlugAccess,
  catalogSlugMatchesRouteSegment,
  principalGrantsNavNodeAccess,
  principalHasProductWideNavCapability,
  resolveCatalogModuleSlugsForNavRoute,
} from './nav-capability-access';
import { capabilityKeysGrantProductAccess } from './module-product-access';
import type { ModuleCatalogIndex } from '@/platform/modules/types';

const catalogIndex: ModuleCatalogIndex = {
  byId: new Map(),
  bySlug: new Map([
    [
      'chronic-illnesses',
      {
        id: 'ci',
        slug: 'chronic-illnesses',
        name: 'Chronic illnesses',
        icon: null,
        category: 'clinical',
        is_active: true,
        level: 2,
        parent_id: 'vp',
      },
    ],
    [
      'allergy-reactions',
      {
        id: 'ar',
        slug: 'allergy-reactions',
        name: 'Reactions',
        icon: null,
        category: 'clinical',
        is_active: true,
        level: 2,
        parent_id: 'vp',
      },
    ],
  ]),
};

describe('catalogSlugMatchesRouteSegment', () => {
  it('matches hyphen-normalized slugs', () => {
    expect(catalogSlugMatchesRouteSegment('rxcolumns', 'rx-columns')).toBe(true);
  });

  it('matches plural catalog slugs', () => {
    expect(catalogSlugMatchesRouteSegment('chronic-illnesses', 'chronic-illness')).toBe(true);
  });

  it('matches tenant-modules from tenant route segment', () => {
    expect(catalogSlugMatchesRouteSegment('tenant-modules', 'tenant')).toBe(true);
  });

  it('does not treat unit capability segment as conversions module slug', () => {
    expect(catalogSlugMatchesRouteSegment('conversions', 'unit')).toBe(false);
    expect(catalogSlugMatchesRouteSegment('unit-conversions', 'unit')).toBe(true);
  });
});

describe('resolveCatalogModuleSlugsForNavRoute', () => {
  it('resolves visitpad allergens from route segment', () => {
    const slugs = resolveCatalogModuleSlugsForNavRoute('/visitpad/allergens', {
      routePrefix: '/visitpad',
    });
    expect(slugs).toContain('allergens');
  });

  it('uses catalogModuleSlug override for chronic illness route', () => {
    const slugs = resolveCatalogModuleSlugsForNavRoute('/visitpad/chronic-illness', {
      routePrefix: '/visitpad',
      catalogModuleSlug: 'chronic-illnesses',
      catalogIndex,
    });
    expect(slugs).toContain('chronic-illnesses');
  });
});

describe('principalHasProductWideNavCapability', () => {
  it('grants visitpad-templates for visitpad:view shell key', () => {
    const keys = new Set(['visitpad-templates:visitpad:view']);
    expect(principalHasProductWideNavCapability(keys, ['visitpad-templates'])).toBe(true);
  });

  it('denies when resource segment is not product-wide', () => {
    const keys = new Set(['visitpad-templates:catalog:read']);
    expect(principalHasProductWideNavCapability(keys, ['visitpad-templates'])).toBe(false);
  });
});

describe('principalGrantsNavNodeAccess', () => {
  const ndwadPrincipal = new Set([
    'allergens:allergens:read',
    'vitals:vitals:read',
    'modules:modules:read',
    'tenant-modules:tenant-modules:read',
    'users:users:read',
    'visitpad-templates:catalog:read',
  ]);

  const segments = buildPrincipalCapabilityModuleSegments(ndwadPrincipal);

  function accessInput(keys: ReadonlySet<string>) {
    return buildNavCapabilityAccessInput(
      keys,
      catalogIndex,
      false,
      (productSlugs) => capabilityKeysGrantProductAccess(keys, productSlugs, catalogIndex),
    );
  }

  it('shows visitpad allergens without visitpad:view shell key', () => {
    expect(
      principalGrantsNavNodeAccess(
        accessInput(ndwadPrincipal),
        { id: 'visitpad-allergens', label: 'Allergens', route: '/visitpad/allergens' },
        { parentProductSlugs: ['visitpad-templates'], routePrefix: '/visitpad' },
      ),
    ).toBe(true);
  });

  it('denies visitpad child when principal lacks matching module segment', () => {
    expect(
      principalGrantsNavNodeAccess(
        accessInput(ndwadPrincipal),
        { id: 'visitpad-conversions', label: 'Conversions', route: '/visitpad/conversions' },
        { parentProductSlugs: ['visitpad-templates'], routePrefix: '/visitpad' },
      ),
    ).toBe(false);
  });

  it('grants all visitpad child routes for visitpad-templates:visitpad:view only', () => {
    const shellViewOnly = new Set(['visitpad-templates:visitpad:view']);
    expect(
      principalGrantsNavNodeAccess(
        accessInput(shellViewOnly),
        { id: 'visitpad-vitals', label: 'Vitals', route: '/visitpad/vitals' },
        { parentProductSlugs: ['visitpad-templates'], routePrefix: '/visitpad' },
      ),
    ).toBe(true);
    expect(
      principalGrantsNavNodeAccess(
        accessInput(shellViewOnly),
        { id: 'visitpad', label: 'Visitpad', route: '/visitpad' },
        { parentProductSlugs: ['visitpad-templates'], routePrefix: '/visitpad' },
      ),
    ).toBe(true);
  });

  it('shows master-data modules page for modules:modules:read', () => {
    expect(
      principalGrantsNavNodeAccess(
        accessInput(ndwadPrincipal),
        { id: 'master-data-modules', label: 'Modules', route: '/master-data/modules' },
        { parentProductSlugs: ['master-data'] },
      ),
    ).toBe(true);
  });

  it('shows configurator tenant for tenant-modules:* principal', () => {
    expect(
      principalGrantsNavNodeAccess(
        accessInput(ndwadPrincipal),
        {
          id: 'configurator-tenant',
          label: 'Tenant',
          route: '/configurator/tenant',
          catalogModuleSlug: 'tenant-modules',
        },
        { parentProductSlugs: ['configurator'] },
      ),
    ).toBe(true);
  });

  it('grants user-management users leaf via catalogModuleSlug', () => {
    expect(
      capabilityKeysGrantModuleSlugAccess(segments, ['users']),
    ).toBe(true);
  });
});
