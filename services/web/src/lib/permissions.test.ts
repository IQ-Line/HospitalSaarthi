import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthPrincipalResponse } from '@/lib/auth-principal';
import { hydrateCapabilitiesFromPrincipal } from '@/lib/permissions';
import { usePermissionsStore } from '@/stores/permissions.store';

describe('hydrateCapabilitiesFromPrincipal', () => {
  beforeEach(() => {
    usePermissionsStore.getState().clearPermissions();
  });

  it('hydrates from a provided principal without refetching', async () => {
    const principal: AuthPrincipalResponse = {
      id: 'user-1',
      roles: [],
      attributes: {
        capabilities: ['users:users:read', 'master-data:shell:access'],
        delegated_capabilities: ['visitpad-templates:visitpad:view'],
      },
    };

    await hydrateCapabilitiesFromPrincipal(principal);

    const state = usePermissionsStore.getState();
    expect(state.isLoaded).toBe(true);
    expect([...state.capabilityKeys].sort()).toEqual([
      'master-data:shell:access',
      'visitpad-templates:visitpad:view',
      'users:users:read',
    ]);
  });
});
