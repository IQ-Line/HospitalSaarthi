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
        capabilities: ['um:user:read', 'md:shell:access'],
        delegated_capabilities: ['md:visitpad:view'],
      },
    };

    await hydrateCapabilitiesFromPrincipal(principal);

    const state = usePermissionsStore.getState();
    expect(state.isLoaded).toBe(true);
    expect([...state.capabilityKeys].sort()).toEqual([
      'md:shell:access',
      'md:visitpad:view',
      'um:user:read',
    ]);
  });
});
