import { describe, expect, it, beforeEach } from 'vitest';
import { clearModuleRegistryForTests, registerBuiltinModuleManifests } from '@/platform/modules';
import {
  catalogModuleSlugForVisitpadManifestNode,
  filterVisitpadPrimaryTabGroups,
  firstAccessibleVisitpadPathInPrimaryTab,
  principalGrantsVisitpadManifestNodeAccess,
  principalGrantsVisitpadPrimaryTabAccess,
  resolveVisitpadPrimaryTabLandingRoute,
} from '../../../../../src/features/visitpad/lib/visitpad-access';

/** L2-scoped keys only — `visitpad:view` shell does not substitute for per-module L2 actions. */
const testRoleKeys = new Set([
  'allergens:allergens:create',
  'allergens:allergens:read',
  'allergy-reactions:allergy-reactions:read',
  'units:units:read',
]);

describe('visitpad-access for test-role principal', () => {
  beforeEach(() => {
    clearModuleRegistryForTests();
    registerBuiltinModuleManifests();
  });

  it('allows all manifest leaves and primary tabs for visitpad-master shell view only', () => {
    const shellViewOnly = new Set(['visitpad-master:visitpad:view']);
    expect(principalGrantsVisitpadManifestNodeAccess(shellViewOnly, 'visitpad-vitals')).toBe(
      true,
    );
    expect(
      principalGrantsVisitpadManifestNodeAccess(shellViewOnly, 'visitpad-chief-complaints'),
    ).toBe(true);
    expect(filterVisitpadPrimaryTabGroups(shellViewOnly).length).toBeGreaterThanOrEqual(10);
  });

  it('allows allergens and units, denies chief complaints', () => {
    expect(
      principalGrantsVisitpadManifestNodeAccess(testRoleKeys, 'visitpad-allergens'),
    ).toBe(true);
    expect(principalGrantsVisitpadManifestNodeAccess(testRoleKeys, 'visitpad-units')).toBe(true);
    expect(
      principalGrantsVisitpadManifestNodeAccess(testRoleKeys, 'visitpad-chief-complaints'),
    ).toBe(false);
    expect(principalGrantsVisitpadManifestNodeAccess(testRoleKeys, 'visitpad-vitals')).toBe(
      false,
    );
  });

  it('filters primary tabs to permitted modules only', () => {
    const tabs = filterVisitpadPrimaryTabGroups(testRoleKeys);
    const ids = tabs.map((t) => t.id);
    expect(ids).toContain('allergies');
    expect(ids).toContain('units');
    expect(ids).not.toContain('chief-complaints');
    expect(ids).not.toContain('vitals');
  });

  it('shows allergies tab when only reactions are permitted', () => {
    const reactionsOnly = new Set(['allergy-reactions:allergy-reactions:read']);
    expect(principalGrantsVisitpadPrimaryTabAccess(reactionsOnly, 'allergies')).toBe(true);
  });

  it('resolves catalog module slug from manifest override', () => {
    expect(catalogModuleSlugForVisitpadManifestNode('visitpad-rx-columns')).toBe('rxcolumns');
    expect(catalogModuleSlugForVisitpadManifestNode('visitpad-chronic-illness')).toBe(
      'chronic-illnesses',
    );
  });

  it('lands allergies tab on reactions when allergens are not permitted', () => {
    const reactionsOnly = new Set(['allergy-reactions:allergy-reactions:read']);
    expect(firstAccessibleVisitpadPathInPrimaryTab(reactionsOnly, 'allergies')).toBe(
      '/visitpad/reactions',
    );
    expect(resolveVisitpadPrimaryTabLandingRoute(reactionsOnly, 'allergies')).toBe(
      '/visitpad/reactions',
    );
  });

  it('lands units tab on conversions when units are not permitted', () => {
    const conversionsOnly = new Set(['unit-conversions:unit-conversions:read']);
    expect(firstAccessibleVisitpadPathInPrimaryTab(conversionsOnly, 'units')).toBe(
      '/visitpad/conversions',
    );
    expect(resolveVisitpadPrimaryTabLandingRoute(conversionsOnly, 'units')).toBe(
      '/visitpad/conversions',
    );
  });
});
