import type { NavigationNode } from '@/navigation/types';
import { composeNavigationManifest } from './module-manifest-loader';
import { getRegisteredModuleManifests } from './module-registry';

/** Composed navigation tree from registered module manifests. */
export function useComposedNavigationManifest(): readonly NavigationNode[] {
  return composeNavigationManifest(getRegisteredModuleManifests());
}
