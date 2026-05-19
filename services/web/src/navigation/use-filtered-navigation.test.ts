import { describe, expect, it, beforeEach } from 'vitest';
import { MD_VISITPAD_VIEW, UM_USER_READ } from '@/lib/runtime-capability-keys';
import { normalizeCapabilityKey } from '@/lib/principal-capabilities';
import {
  composeNavigationManifest,
  getRegisteredModuleManifests,
  registerBuiltinModuleManifests,
} from '@/platform/modules';
import { usePermissionsStore } from '@/stores/permissions.store';
import { buildNavFilterContext } from './use-filtered-navigation';
import { filterNavigationTree } from './filter-navigation-tree';

describe('buildNavFilterContext', () => {
  beforeEach(() => {
    registerBuiltinModuleManifests();
    usePermissionsStore.getState().clearPermissions();
  });

  it('reflects capabilityKeys changes (principal hydration)', () => {
    const manifest = composeNavigationManifest(getRegisteredModuleManifests());
    const enabled = new Set(['user-management', 'visitpad-templates']);

    const beforeHydration = filterNavigationTree(
      manifest,
      buildNavFilterContext(new Set(), enabled),
    );
    expect(beforeHydration.map((n) => n.id)).not.toContain('user-management');
    expect(beforeHydration.map((n) => n.id)).not.toContain('visitpad');

    const keys = new Set([UM_USER_READ].map((k) => normalizeCapabilityKey(k)));
    const afterUm = filterNavigationTree(manifest, buildNavFilterContext(keys, enabled));
    expect(afterUm.map((n) => n.id)).toContain('user-management');
    expect(afterUm.map((n) => n.id)).not.toContain('visitpad');

    const visitpadKeys = new Set([normalizeCapabilityKey(MD_VISITPAD_VIEW)]);
    const afterVisitpad = filterNavigationTree(
      manifest,
      buildNavFilterContext(visitpadKeys, enabled),
    );
    expect(afterVisitpad.map((n) => n.id)).toContain('visitpad');
    expect(afterVisitpad.map((n) => n.id)).not.toContain('user-management');
  });

  it('uses store capabilityKeys after setCapabilityKeys', () => {
    const manifest = composeNavigationManifest(getRegisteredModuleManifests());
    const enabled = new Set(['user-management']);

    usePermissionsStore.getState().setCapabilityKeys([UM_USER_READ]);
    const { capabilityKeys } = usePermissionsStore.getState();

    const filtered = filterNavigationTree(
      manifest,
      buildNavFilterContext(capabilityKeys, enabled),
    );
    expect(filtered.map((n) => n.id)).toContain('user-management');
  });
});
