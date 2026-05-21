import type { AuthPrincipalResponse } from '@/lib/auth-principal';
import { capabilityKeysFromPrincipalAttributes } from '@/lib/principal-capabilities';
import { fetchAuthPrincipal } from '@/lib/auth-principal';
import { usePermissionsStore } from '@/stores/permissions.store';

/**
 * Hydrates shell authorization from `GET /auth/principal` capability keys only.
 * APIs and Cerbos PDP remain authoritative.
 */
export async function hydrateCapabilitiesFromPrincipal(
  principal?: AuthPrincipalResponse,
): Promise<void> {
  const payload = principal ?? (await fetchAuthPrincipal());
  const keys = capabilityKeysFromPrincipalAttributes(payload.attributes);
  usePermissionsStore.getState().setCapabilityKeys(keys, payload.roles);
}