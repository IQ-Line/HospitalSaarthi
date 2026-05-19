import { isPlatformSuperAdminFromAccessToken } from '@/lib/platform-admin';
import type { CapabilityKey } from '@/stores/permissions.store';
import { useAuthStore } from '@/stores/auth.store';
import { usePermissionsStore } from '@/stores/permissions.store';

export type { CapabilityKey };

function shellBypassActive(): boolean {
  return isPlatformSuperAdminFromAccessToken(useAuthStore.getState().accessToken);
}

export function hasCapability(capabilityKey: CapabilityKey): boolean {
  if (shellBypassActive()) {
    return true;
  }
  return usePermissionsStore.getState().hasCapability(capabilityKey);
}

export function hasAnyCapability(capabilityKeys: readonly CapabilityKey[]): boolean {
  if (shellBypassActive()) {
    return true;
  }
  return usePermissionsStore.getState().hasAnyCapability(capabilityKeys);
}

export function hasAllCapabilities(capabilityKeys: readonly CapabilityKey[]): boolean {
  if (shellBypassActive()) {
    return true;
  }
  return usePermissionsStore.getState().hasAllCapabilities(capabilityKeys);
}
