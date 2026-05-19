import { create, type StateCreator } from 'zustand';
import { devtools } from 'zustand/middleware';
import { normalizeCapabilityKey } from '@/lib/principal-capabilities';

export type CapabilityKey = string;

export interface PermissionsState {
  capabilityKeys: ReadonlySet<CapabilityKey>;
  isLoaded: boolean;

  setCapabilityKeys: (keys: readonly CapabilityKey[]) => void;
  clearPermissions: () => void;
  hasCapability: (capabilityKey: CapabilityKey) => boolean;
  hasAnyCapability: (capabilityKeys: readonly CapabilityKey[]) => boolean;
  hasAllCapabilities: (capabilityKeys: readonly CapabilityKey[]) => boolean;
}

const emptyKeys = (): ReadonlySet<CapabilityKey> => new Set();

const permissionsSlice: StateCreator<PermissionsState> = (set, get) => ({
  capabilityKeys: emptyKeys(),
  isLoaded: false,

  setCapabilityKeys: (keys) =>
    set(
      {
        capabilityKeys: new Set(keys.map((k) => normalizeCapabilityKey(k))),
        isLoaded: true,
      },
      false,
      'setCapabilityKeys',
    ),

  clearPermissions: () => {
    set({ capabilityKeys: emptyKeys(), isLoaded: false }, false, 'clearPermissions');
  },

  hasCapability: (capabilityKey) => {
    return get().capabilityKeys.has(normalizeCapabilityKey(capabilityKey));
  },

  hasAnyCapability: (capabilityKeys) => {
    if (capabilityKeys.length === 0) {
      return false;
    }
    const held = get().capabilityKeys;
    return capabilityKeys.some((key) => held.has(normalizeCapabilityKey(key)));
  },

  hasAllCapabilities: (capabilityKeys) => {
    if (capabilityKeys.length === 0) {
      return false;
    }
    const held = get().capabilityKeys;
    return capabilityKeys.every((key) => held.has(normalizeCapabilityKey(key)));
  },
});

export const usePermissionsStore = create<PermissionsState>()(
  devtools(permissionsSlice, { name: 'permissions' }),
);
