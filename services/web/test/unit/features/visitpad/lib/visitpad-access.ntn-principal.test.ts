import { describe, expect, it, beforeEach } from 'vitest';
import { clearModuleRegistryForTests, registerBuiltinModuleManifests } from '@/platform/modules';
import { principalHasCatalogModuleAction } from '@/lib/catalog-route-access';
import { visitpadModuleManifest } from '@/platform/modules/manifests/visitpad.manifest';
import {
  catalogModuleSlugForVisitpadManifestNode,
  filterVisitpadManifestNodesByAccess,
  filterVisitpadPrimaryTabGroups,
  principalGrantsVisitpadManifestNodeAccess,
} from '../../../../../src/features/visitpad/lib/visitpad-access';

/** Role `ntn` capability snapshot (visitpad-relevant subset). */
const NTN_CAPABILITY_KEYS = new Set([
  'allergens:allergens:create',
  'allergens:allergens:delete',
  'allergens:allergens:read',
  'allergens:allergens:update',
  'allergy-reactions:allergy-reactions:create',
  'allergy-reactions:allergy-reactions:delete',
  'allergy-reactions:allergy-reactions:read',
  'allergy-reactions:allergy-reactions:update',
  'chief-complaints:chief-complaints:create',
  'chief-complaints:chief-complaints:delete',
  'chief-complaints:chief-complaints:read',
  'chief-complaints:chief-complaints:update',
  'chronic-illnesses:chronic-illnesses:create',
  'chronic-illnesses:chronic-illnesses:delete',
  'chronic-illnesses:chronic-illnesses:read',
  'chronic-illnesses:chronic-illnesses:update',
  'diagnoses:diagnoses:create',
  'diagnoses:diagnoses:delete',
  'diagnoses:diagnoses:read',
  'diagnoses:diagnoses:update',
  'manufacturers:manufacturers:create',
  'manufacturers:manufacturers:delete',
  'manufacturers:manufacturers:read',
  'manufacturers:manufacturers:update',
  'medicines:medicines:create',
  'medicines:medicines:delete',
  'medicines:medicines:read',
  'medicines:medicines:update',
  'procedures:procedures:create',
  'procedures:procedures:delete',
  'procedures:procedures:read',
  'procedures:procedures:update',
  'rxcolumns:rxcolumns:create',
  'rxcolumns:rxcolumns:delete',
  'rxcolumns:rxcolumns:read',
  'rxcolumns:rxcolumns:update',
  'unit:unit:create',
  'unit:unit:delete',
  'unit:unit:read',
  'unit:unit:update',
  'units:units:create',
  'units:units:delete',
  'units:units:read',
  'units:units:update',
  'vaccines:vaccines:create',
  'vaccines:vaccines:delete',
  'vaccines:vaccines:read',
  'vaccines:vaccines:update',
  'visitpad-master:visitpad-master:create',
  'visitpad-master:visitpad-master:delete',
  'visitpad-master:visitpad-master:read',
  'visitpad-master:visitpad-master:update',
  'visitpad-master:visitpad:create',
  'visitpad-master:visitpad:view',
  'vitals:vitals:create',
  'vitals:vitals:delete',
  'vitals:vitals:read',
  'vitals:vitals:update',
]);

describe('ntn principal — visitpad UI access audit', () => {
  beforeEach(() => {
    clearModuleRegistryForTests();
    registerBuiltinModuleManifests();
  });

  it('shows all visitpad catalog tabs except conversions (no unit-conversions keys)', () => {
    const tabIds = filterVisitpadPrimaryTabGroups(NTN_CAPABILITY_KEYS).map((t) => t.id);
    expect(tabIds).toContain('units');
    expect(tabIds).toContain('vitals');
    expect(tabIds).toContain('chief-complaints');
    expect(tabIds).toContain('allergies');
    expect(
      filterVisitpadManifestNodesByAccess(['visitpad-conversions'], NTN_CAPABILITY_KEYS),
    ).toHaveLength(0);
  });

  it('denies conversions route and does not grant mutate via unit:unit keys', () => {
    expect(
      principalGrantsVisitpadManifestNodeAccess(NTN_CAPABILITY_KEYS, 'visitpad-conversions'),
    ).toBe(false);
    const conversionsSlug = catalogModuleSlugForVisitpadManifestNode('visitpad-conversions');
    expect(conversionsSlug).toBe('unit-conversions');
    expect(
      principalHasCatalogModuleAction(NTN_CAPABILITY_KEYS, conversionsSlug, 'create'),
    ).toBe(false);
    expect(principalHasCatalogModuleAction(NTN_CAPABILITY_KEYS, 'unit', 'create')).toBe(true);
    expect(principalHasCatalogModuleAction(NTN_CAPABILITY_KEYS, 'units', 'create')).toBe(true);
  });

  it('allows units secondary nav link but not conversions', () => {
    const links = filterVisitpadManifestNodesByAccess(
      ['visitpad-units', 'visitpad-conversions'],
      NTN_CAPABILITY_KEYS,
    );
    expect(links.map((n) => n.id)).toEqual(['visitpad-units']);
  });

  it('matches manifest leaves to granted L2 modules', () => {
    const allowed = visitpadModuleManifest.navigation
      .filter((node) => principalGrantsVisitpadManifestNodeAccess(NTN_CAPABILITY_KEYS, node.id))
      .map((node) => node.id);

    expect(allowed).toContain('visitpad-units');
    expect(allowed).toContain('visitpad-chief-complaints');
    expect(allowed).toContain('visitpad-allergens');
    expect(allowed).not.toContain('visitpad-conversions');
  });
});
