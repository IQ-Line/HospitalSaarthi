import { describe, expect, it, beforeEach } from 'vitest';
import { registerBuiltinModuleManifests, clearModuleRegistryForTests } from '@/platform/modules';
import { capabilityKeysGrantProductAccessFromManifest } from './manifest-product-access';
import { principalGrantsCatalogRouteAccess } from '@/lib/catalog-route-access';

const nhmVisitpadKeys = new Set([
  'allergens:allergens:read',
  'units:units:read',
  'chief-complaints:chief-complaints:read',
]);

describe('capabilityKeysGrantProductAccessFromManifest', () => {
  beforeEach(() => {
    clearModuleRegistryForTests();
    registerBuiltinModuleManifests();
  });

  it('grants visitpad-templates when principal has L2 catalog keys only', () => {
    expect(
      capabilityKeysGrantProductAccessFromManifest(nhmVisitpadKeys, ['visitpad-templates']),
    ).toBe(true);
  });

  it('denies visitpad-templates when principal has no matching L2 keys', () => {
    expect(
      capabilityKeysGrantProductAccessFromManifest(new Set(['configurator:shell:access']), [
        'visitpad-templates',
      ]),
    ).toBe(false);
  });
});

describe('visitpad layout route for NHM principal', () => {
  beforeEach(() => {
    clearModuleRegistryForTests();
    registerBuiltinModuleManifests();
  });

  it('allows /visitpad layout and child routes without visitpad-templates:* keys', () => {
    expect(
      principalGrantsCatalogRouteAccess(nhmVisitpadKeys, '/visitpad', {
        catalogProductSlugs: ['visitpad-templates'],
        routePrefix: '/visitpad',
      }),
    ).toBe(true);
    expect(
      principalGrantsCatalogRouteAccess(nhmVisitpadKeys, '/visitpad/allergens', {
        catalogProductSlugs: ['visitpad-templates'],
        routePrefix: '/visitpad',
      }),
    ).toBe(true);
  });
});
