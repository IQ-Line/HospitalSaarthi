import {
  composeNavigationManifest,
  getRegisteredModuleManifests,
  registerBuiltinModuleManifests,
} from '@/platform/modules';

registerBuiltinModuleManifests();

/**
 * Composed shell navigation from registered {@link ModuleManifest} entries.
 * Prefer `useComposedNavigationManifest()` in React; this export supports tests and SSR-free snapshots.
 */
export const NAVIGATION_MANIFEST = composeNavigationManifest(getRegisteredModuleManifests());
