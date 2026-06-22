import { beforeEach, describe, expect, it } from 'vitest';
import {
  FD_SHELL_ACCESS,
  PHARMACY_DISPENSE_READ,
  PHARMACY_DISPENSE_UPDATE,
} from '@/lib/runtime-capability-keys';
import { applyCatalogNavigationLabels } from '../../../src/navigation/apply-catalog-navigation-labels';
import { filterNavigationTree } from '../../../src/navigation/filter-navigation-tree';
import { buildNavFilterContext } from '../../../src/navigation/use-filtered-navigation';
import { DEV_CATALOG_L1_FIXTURE } from '../../../src/navigation/dev-catalog-l1.fixture';
import {
  clearModuleRegistryForTests,
  getRegisteredModuleManifests,
} from '@/platform/modules/module-registry';
import { composeNavigationManifest, invalidateComposedNavigationCache } from '@/platform/modules/module-manifest-loader';
import { registerBuiltinModuleManifests } from '@/platform/modules/register-builtin-modules';

function filterForRoles(
  roles: readonly string[],
  capabilityKeys: ReadonlySet<string>,
  enabledModuleSlugs: ReadonlySet<string>,
) {
  const manifest = composeNavigationManifest(getRegisteredModuleManifests());
  const filtered = filterNavigationTree(
    manifest,
    buildNavFilterContext(capabilityKeys, enabledModuleSlugs, {
      principalRoles: roles,
      catalogIndex: DEV_CATALOG_L1_FIXTURE,
    }),
  );
  return applyCatalogNavigationLabels(filtered, DEV_CATALOG_L1_FIXTURE);
}

describe('clinical role sidebar entries', () => {
  const enabled = new Set(['frontdesk', 'opd']);
  const opdCaps = new Set(['opd:patient:read']);

  beforeEach(() => {
    clearModuleRegistryForTests();
    invalidateComposedNavigationCache();
    registerBuiltinModuleManifests();
  });

  it('shows Doctor (not Frontdesk) with Patients child for doctor role', () => {
    const roots = filterForRoles(['doctor'], opdCaps, enabled);
    const doctor = roots.find((n) => n.id === 'doctor');
    expect(doctor?.label).toBe('Doctor');
    expect(doctor?.children?.map((c) => c.label)).toEqual(['Patients']);
    expect(doctor?.children?.[0]?.route).toBe('/patients');
    expect(roots.find((n) => n.id === 'nurse')).toBeUndefined();
  });

  it('shows Nurse with Patients child for nurse role', () => {
    const roots = filterForRoles(['nurse'], opdCaps, enabled);
    const nurse = roots.find((n) => n.id === 'nurse');
    expect(nurse?.label).toBe('Nurse');
    expect(nurse?.children?.[0]?.route).toBe('/nurse/patients');
    expect(roots.find((n) => n.id === 'doctor')).toBeUndefined();
  });

  it('hides Frontdesk group for doctor role even with frontdesk capabilities', () => {
    const roots = filterForRoles(['doctor'], new Set([FD_SHELL_ACCESS, 'opd:patient:read']), enabled);
    expect(roots.find((n) => n.id === 'frontdesk')).toBeUndefined();
  });

  it('shows Frontdesk group for receptionist or frontdesk role', () => {
    const frontdeskCaps = new Set([FD_SHELL_ACCESS, 'registration:registration:read']);
    expect(filterForRoles(['receptionist'], frontdeskCaps, enabled).find((n) => n.id === 'frontdesk')).toBeDefined();
    expect(filterForRoles(['frontdesk'], frontdeskCaps, enabled).find((n) => n.id === 'frontdesk')).toBeDefined();
  });

  it('shows Pharmacy only for pharmacist role with dispense access', () => {
    const pharmacyCaps = new Set([PHARMACY_DISPENSE_READ, PHARMACY_DISPENSE_UPDATE]);
    const enabledWithPharmacy = new Set(['pharmacy']);
    expect(
      filterForRoles(['pharmacist'], pharmacyCaps, enabledWithPharmacy).find((n) => n.id === 'pharmacy'),
    ).toBeDefined();
  });

  it('hides Pharmacy for frontdesk even when pharmacy module is enabled', () => {
    const frontdeskCaps = new Set([FD_SHELL_ACCESS, 'registration:registration:read']);
    const enabledWithPharmacy = new Set(['frontdesk', 'pharmacy']);
    expect(
      filterForRoles(['frontdesk'], frontdeskCaps, enabledWithPharmacy).find((n) => n.id === 'pharmacy'),
    ).toBeUndefined();
  });
});
