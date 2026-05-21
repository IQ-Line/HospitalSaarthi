import { describe, expect, it } from 'vitest';
import {
  principalGrantsCatalogRouteAccess,
  principalHasCatalogModuleAction,
} from './catalog-route-access';

const ndwadPrincipal = new Set([
  'allergens:allergens:read',
  'tenant-modules:tenant-modules:read',
  'users:users:read',
  'visitpad-templates:catalog:read',
]);

describe('principalGrantsCatalogRouteAccess', () => {
  it('allows visitpad when principal has an L2 catalog key', () => {
    expect(
      principalGrantsCatalogRouteAccess(ndwadPrincipal, '/visitpad/allergens', {
        catalogProductSlugs: ['visitpad-templates'],
        routePrefix: '/visitpad',
      }),
    ).toBe(true);
  });

  it('allows visitpad layout for L2-only principal (no visitpad-templates shell keys)', () => {
    const keys = new Set(['allergens:allergens:read', 'units:units:update']);
    expect(
      principalGrantsCatalogRouteAccess(keys, '/visitpad', {
        catalogProductSlugs: ['visitpad-templates'],
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

describe('principalHasCatalogModuleAction', () => {
  it('detects tenants:create from principal keys', () => {
    const keys = new Set([...ndwadPrincipal, 'tenants:tenants:create']);
    expect(principalHasCatalogModuleAction(keys, 'tenants', 'create')).toBe(true);
  });

  it('returns false when create was removed from the role', () => {
    expect(principalHasCatalogModuleAction(ndwadPrincipal, 'tenants', 'create')).toBe(false);
  });
});
