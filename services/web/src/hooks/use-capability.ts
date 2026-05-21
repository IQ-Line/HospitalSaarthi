import {
  hasAllCapabilities,
  hasAnyCapability,
  hasCapability,
  type CapabilityKey,
} from '@/lib/capabilities';
import { usePermissionsStore } from '@/stores/permissions.store';

export type { CapabilityKey };

/**
 * React hook: holds a single runtime capability key.
 *
 * @see {@link CapabilityGate} for declarative rendering
 * @see `docs/architecture/authorization/capability-key-first.md`
 */
export function useCapability(capabilityKey: CapabilityKey): boolean {
  return usePermissionsStore((s) => s.hasCapability(capabilityKey));
}

/**
 * React hook: holds any of the listed runtime capability keys.
 */
export function useAnyCapability(capabilityKeys: readonly CapabilityKey[]): boolean {
  return usePermissionsStore((s) => s.hasAnyCapability(capabilityKeys));
}

/**
 * React hook: holds all of the listed runtime capability keys.
 */
export function useAllCapabilities(capabilityKeys: readonly CapabilityKey[]): boolean {
  return usePermissionsStore((s) => s.hasAllCapabilities(capabilityKeys));
}

/** Imperative helpers (non-React) — same resolution as hooks. */
export { hasCapability, hasAnyCapability, hasAllCapabilities };
