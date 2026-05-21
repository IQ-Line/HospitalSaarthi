import { assertValidRuntimeCapabilityRow } from "../domain/capability-key.js";
import { projectCapabilityRowToCanonical } from "../domain/legacy-capability-key-remap.js";
import { normalizeCapabilityProvenance } from "../domain/capability-provenance.js";
import { assertValidModuleSlug, normalizeModuleSlug } from "../domain/module-slug.js";
import type { Capability, CapabilityRepository } from "../ports/index.js";

type SeedCapability = {
  capability: Capability;
};

function capabilityKey(capabilityId: string): string {
  return capabilityId;
}

export class InMemoryCapabilityRepository implements CapabilityRepository {
  private readonly capabilities = new Map<string, Capability>();

  constructor(seedCapabilities: SeedCapability[] = []) {
    for (const seed of seedCapabilities) {
      const module = assertValidModuleSlug(seed.capability.module, "capability.module");
      const provenance = normalizeCapabilityProvenance({
        source_module_slug: seed.capability.source_module_slug,
        source_permission_slug: seed.capability.source_permission_slug,
        source_catalog: seed.capability.source_catalog ?? null,
      });
      const capability = projectCapabilityRowToCanonical({
        ...seed.capability,
        module,
        ...provenance,
      });
      assertValidRuntimeCapabilityRow(capability, `seed:${seed.capability.id}`);
      this.capabilities.set(capabilityKey(seed.capability.id), capability);
    }
  }

  async getCapabilityById(capabilityId: string): Promise<Capability | null> {
    return this.capabilities.get(capabilityKey(capabilityId)) ?? null;
  }

  async listCapabilities(): Promise<Capability[]> {
    return [...this.capabilities.values()];
  }

  async listCapabilitiesByIds(capabilityIds: string[]): Promise<Capability[]> {
    return capabilityIds
      .map((capabilityId) => this.capabilities.get(capabilityKey(capabilityId)) ?? null)
      .filter((capability): capability is Capability => capability !== null);
  }

  async listCapabilitiesByKeys(capabilityKeys: string[]): Promise<Capability[]> {
    const keys = new Set(capabilityKeys);
    return [...this.capabilities.values()]
      .filter((capability) => keys.has(capability.capability_key))
      .filter((capability): capability is Capability => capability !== null);
  }

  async listActiveRuntimeCapabilitiesByModuleSlugs(moduleSlugs: string[]): Promise<Capability[]> {
    const normalized = [
      ...new Set(moduleSlugs.map((m) => normalizeModuleSlug(m)).filter((m) => m.length > 0)),
    ];
    if (normalized.length === 0) {
      return [];
    }
    const moduleSet = new Set(
      normalized.map((m) => assertValidModuleSlug(m, "assignable module slug filter")),
    );
    return [...this.capabilities.values()].filter((capability) => {
      if (!capability.is_active) {
        return false;
      }
      if (moduleSet.has(capability.module)) {
        return true;
      }
      const source = capability.source_module_slug?.trim();
      return source !== undefined && source.length > 0 && moduleSet.has(source);
    });
  }
}
