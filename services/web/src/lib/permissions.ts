import type { AuthPrincipalResponse } from '@/lib/auth-principal';
import { capabilityKeysFromPrincipalAttributes, normalizeCapabilityKey } from '@/lib/principal-capabilities';
import { fetchAuthPrincipal } from '@/lib/auth-principal';
import { isPlatformSuperAdmin } from '@/lib/platform-admin';
import {
  collectNavigationCapabilityKeys,
  getRegisteredModuleManifests,
  registerBuiltinModuleManifests,
} from '@/platform/modules';
import { usePermissionsStore } from '@/stores/permissions.store';

/**
 * Super-admin shell: union principal capabilities with every key declared on registered
 * module manifests (nav + route gates). Tenant module enablement is unchanged.
 */
export function capabilityKeysForShellPrincipal(
  principal: AuthPrincipalResponse,
): readonly string[] {
  const fromPrincipal = capabilityKeysFromPrincipalAttributes(principal.attributes);
  if (!isPlatformSuperAdmin(principal.roles)) {
    return fromPrincipal;
  }

  registerBuiltinModuleManifests();
  const merged = new Set(fromPrincipal.map((key) => normalizeCapabilityKey(key)));
  for (const key of collectNavigationCapabilityKeys(getRegisteredModuleManifests())) {
    merged.add(key);
  }
  return [...merged].sort((a, b) => a.localeCompare(b));
}

/**
 * Hydrates shell authorization from `GET /auth/principal` capability keys only.
 * APIs and Cerbos PDP remain authoritative.
 */
export async function hydrateCapabilitiesFromPrincipal(
  principal?: AuthPrincipalResponse,
): Promise<void> {
  const payload = principal ?? (await fetchAuthPrincipal());
  const keys = capabilityKeysForShellPrincipal(payload);
  usePermissionsStore.getState().setCapabilityKeys(keys, payload.roles);
}