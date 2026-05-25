import { describe, expect, it } from 'vitest';
import {
  principalGrantsCatalogModuleSlugRouteAccess,
  principalGrantsCatalogRouteAccess,
  principalHasCatalogModuleAction,
} from './catalog-route-access';

const ndwadPrincipal = new Set([
  'allergens:allergens:read',
  'tenant-modules:tenant-modules:read',
  'users:users:read',
]);

describe('principalGrantsCatalogRouteAccess', () => {
  it('allows visitpad when principal has an L2 catalog key', () => {
    expect(
      principalGrantsCatalogRouteAccess(ndwadPrincipal, '/visitpad/allergens', {
        catalogProductSlugs: ['master-data', 'visitpad-master'],
        routePrefix: '/visitpad',
      }),
    ).toBe(true);
  });

  it('denies visitpad child routes for visitpad-master:visitpad:view only', () => {
    const shellViewOnly = new Set(['visitpad-master:visitpad:view']);
    expect(
      principalGrantsCatalogRouteAccess(shellViewOnly, '/visitpad/vitals', {
        catalogProductSlugs: ['master-data', 'visitpad-master'],
        routePrefix: '/visitpad',
      }),
    ).toBe(false);
  });

  it('allows visitpad layout for L2-only principal (no visitpad-master shell keys)', () => {
    const keys = new Set(['allergens:allergens:read', 'units:units:update']);
    expect(
      principalGrantsCatalogRouteAccess(keys, '/visitpad', {
        catalogProductSlugs: ['master-data', 'visitpad-master'],
        routePrefix: '/visitpad',
      }),
    ).toBe(true);
  });

  it('denies configurator tenant when principal lacks tenant-modules and tenants keys', () => {
    const keys = new Set(['configurator:shell:access']);
    expect(
      principalGrantsCatalogRouteAccess(keys, '/configurator/tenant', {
        catalogModuleSlug: 'tenant-modules',
        catalogProductSlugs: ['configurator'],
        routePrefix: '/configurator',
      }),
    ).toBe(false);
  });

  it('allows configurator tenant for tenant-modules:read', () => {
    expect(
      principalGrantsCatalogRouteAccess(ndwadPrincipal, '/configurator/tenant', {
        catalogModuleSlug: 'tenant-modules',
        catalogProductSlugs: ['configurator'],
        routePrefix: '/configurator',
      }),
    ).toBe(true);
  });
});

describe('principalGrantsCatalogModuleSlugRouteAccess', () => {
  it('grants when principal has module read', () => {
    expect(
      principalGrantsCatalogModuleSlugRouteAccess(
        new Set(['chief-complaints:chief-complaints:read']),
        ['chief-complaints'],
      ),
    ).toBe(true);
  });

  it('denies when principal lacks any L2 action on the module', () => {
    expect(
      principalGrantsCatalogModuleSlugRouteAccess(new Set(['visitpad-master:visitpad:view']), [
        'chief-complaints',
      ]),
    ).toBe(false);
  });

  it('grants when principal has create without read', () => {
    expect(
      principalGrantsCatalogModuleSlugRouteAccess(new Set(['vitals:vitals:create']), ['vitals']),
    ).toBe(true);
  });
});

describe('principalHasCatalogModuleAction', () => {
  it('detects tenants:create from principal keys', () => {
    const keys = new Set([...ndwadPrincipal, 'tenants:tenants:create']);
    expect(principalHasCatalogModuleAction(keys, 'tenants', 'create')).toBe(true);
  });

  it('returns false when create was removed from the role', () => {
    expect(principalHasCatalogModuleAction(ndwadPrincipal, 'tenants', 'create')).toBe(false);
  });
});
