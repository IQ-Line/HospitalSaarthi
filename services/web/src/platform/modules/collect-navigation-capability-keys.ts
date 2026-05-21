import { normalizeCapabilityKey } from '@/lib/principal-capabilities';
import type { NavigationNode } from '@/navigation/types';
import type { ModuleManifest } from './types';

function collectFromNode(node: NavigationNode, keys: Set<string>): void {
  for (const key of node.requiredCapabilities ?? []) {
    keys.add(normalizeCapabilityKey(key));
  }
  for (const key of node.requiredCapabilitiesAll ?? []) {
    keys.add(normalizeCapabilityKey(key));
  }
  for (const child of node.children ?? []) {
    collectFromNode(child, keys);
  }
}

/** All runtime capability keys referenced by registered module manifests (nav + module roots). */
export function collectNavigationCapabilityKeys(
  manifests: readonly ModuleManifest[],
): readonly string[] {
  const keys = new Set<string>();

  for (const manifest of manifests) {
    for (const key of manifest.requiredCapabilities ?? []) {
      keys.add(normalizeCapabilityKey(key));
    }
    for (const node of manifest.navigation) {
      collectFromNode(node, keys);
    }
  }

  return [...keys];
}
