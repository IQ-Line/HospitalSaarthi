import { principalGrantsVisitpadManifestNodeAccess } from '@/features/visitpad/lib/visitpad-access';
import { visitpadModuleManifest } from '@/platform/modules/manifests/visitpad.manifest';

/** Default Visitpad leaf when admin nav/route gates are bypassed (manifest order). */
export function defaultVisitpadLandingPath(): string {
  for (const node of visitpadModuleManifest.navigation) {
    if (node.route) {
      return node.route;
    }
  }
  return '/visitpad/units';
}

/** First Visitpad leaf route the principal may open (manifest order). */
export function firstAccessibleVisitpadPath(capabilityKeys: ReadonlySet<string>): string | null {
  for (const node of visitpadModuleManifest.navigation) {
    if (!node.route) {
      continue;
    }
    if (principalGrantsVisitpadManifestNodeAccess(capabilityKeys, node.id)) {
      return node.route;
    }
  }
  return null;
}
