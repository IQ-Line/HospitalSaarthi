import type { Capability } from "../domain/types.js";
import type { ModuleEntitlementRequestContext } from "../ports/module-integration-ports.js";
import type { RuntimeCapabilityCatalogPort } from "../ports/capability-catalog-ports.js";
import type { CapabilityRepository } from "../ports/index.js";
import { listAssignableRuntimeCapabilities } from "../use-cases/list-assignable-runtime-capabilities.js";
import type { ListAssignableRuntimeCapabilitiesDeps } from "../use-cases/list-assignable-runtime-capabilities.js";
import { listCapabilities } from "../use-cases/list-capabilities.js";

export type DefaultRuntimeCapabilityCatalogPortDeps = ListAssignableRuntimeCapabilitiesDeps & {
  capabilityRepository: CapabilityRepository;
};

export function createDefaultRuntimeCapabilityCatalogPort(
  deps: DefaultRuntimeCapabilityCatalogPortDeps,
): RuntimeCapabilityCatalogPort {
  return {
    async listRuntimeCatalog(): Promise<Capability[]> {
      return listCapabilities({ capabilityRepository: deps.capabilityRepository });
    },
    listAssignableForTenant(
      tenantId: string,
      context?: ModuleEntitlementRequestContext,
    ): Promise<Capability[]> {
      return listAssignableRuntimeCapabilities(deps, tenantId, context);
    },
  };
}
