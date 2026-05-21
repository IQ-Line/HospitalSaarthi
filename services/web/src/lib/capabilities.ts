import type { CapabilityKey } from '@/stores/permissions.store';
import { usePermissionsStore } from '@/stores/permissions.store';

export type { CapabilityKey };

export function hasCapability(capabilityKey: CapabilityKey): boolean {
  return usePermissionsStore.getState().hasCapability(capabilityKey);
}

export function hasAnyCapability(capabilityKeys: readonly CapabilityKey[]): boolean {
  return usePermissionsStore.getState().hasAnyCapability(capabilityKeys);
}

export function hasAllCapabilities(capabilityKeys: readonly CapabilityKey[]): boolean {
  return usePermissionsStore.getState().hasAllCapabilities(capabilityKeys);
}
