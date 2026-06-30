import { create, type StateCreator } from 'zustand';
import { devtools } from 'zustand/middleware';
import { normalizeCapabilityKey } from '@/lib/principal-capabilities';

// eslint-disable-next-line sonarjs/redundant-type-aliases -- intentional domain vocabulary: CapabilityKey names a capability identifier across ~22 files; inlining `string` would erase that meaning.
export type CapabilityKey = string;

export interface PermissionsState {
  capabilityKeys: ReadonlySet<CapabilityKey>;
  /** Cerbos role codes from `GET /auth/principal` (e.g. `super-admin`). */
  roles: readonly string[];
  isLoaded: boolean;

  setCapabilityKeys: (keys: readonly CapabilityKey[], roles?: readonly string[]) => void;
  clearPermissions: () => void;
  hasCapability: (capabilityKey: CapabilityKey) => boolean;
  hasAnyCapability: (capabilityKeys: readonly CapabilityKey[]) => boolean;
  hasAllCapabilities: (capabilityKeys: readonly CapabilityKey[]) => boolean;
}

const emptyKeys = (): ReadonlySet<CapabilityKey> => new Set();

const permissionsSlice: StateCreator<PermissionsState, [['zustand/devtools', never]], []> = (
  set,
  get,
) => ({
  capabilityKeys: emptyKeys(),
  roles: [],
  isLoaded: false,

  setCapabilityKeys: (keys, roles = []) =>
    set(
      {
        capabilityKeys: new Set(keys.map((k) => normalizeCapabilityKey(k))),
        roles: [...roles],
        isLoaded: true,
      },
      false,
      'setCapabilityKeys',
    ),

  clearPermissions: () => {
    set({ capabilityKeys: emptyKeys(), roles: [], isLoaded: false }, false, 'clearPermissions');
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
