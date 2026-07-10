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
  const rawScopes = payload.attributes?.scopes;
  const scopes = Array.isArray(rawScopes)
    ? rawScopes.filter((s): s is string => typeof s === 'string' && s.length > 0)
    : [];
  usePermissionsStore.getState().setCapabilityKeys(keys, payload.roles, scopes);
}