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
      this.capabilities.set(capabilityKey(seed.capability.id), seed.capability);
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
}
