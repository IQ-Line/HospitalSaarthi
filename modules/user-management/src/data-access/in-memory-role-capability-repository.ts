import type {
  Capability,
  ReplaceRoleCapabilitiesInput,
  RoleCapabilityRepository,
} from "../ports/index.js";

type SeedRoleCapabilities = {
  tenantId: string;
  roleId: string;
  capabilities: Capability[];
};

function roleKey(tenantId: string, roleId: string): string {
  return `${tenantId}:${roleId}`;
}

export class InMemoryRoleCapabilityRepository implements RoleCapabilityRepository {
  private readonly roleCapabilities = new Map<string, Capability[]>();
  private readonly capabilityById = new Map<string, Capability>();

  /**
   * @param seed Initial role → capability lists
   * @param extraPool Additional capability rows used to resolve {@link replaceCapabilitiesForRole}
   * ids (mirrors FK to the global `capabilities` catalog in Postgres).
   */
  constructor(seed: SeedRoleCapabilities[] = [], extraPool: Capability[] = []) {
    for (const capability of extraPool) {
      this.capabilityById.set(capability.id, capability);
    }
    for (const entry of seed) {
      for (const capability of entry.capabilities) {
        this.capabilityById.set(capability.id, capability);
      }
      this.roleCapabilities.set(roleKey(entry.tenantId, entry.roleId), [...entry.capabilities]);
    }
  }

  async listCapabilitiesByRole(tenantId: string, roleId: string): Promise<Capability[]> {
    return [...(this.roleCapabilities.get(roleKey(tenantId, roleId)) ?? [])];
  }

  async replaceCapabilitiesForRole(
    tenantId: string,
    roleId: string,
    input: ReplaceRoleCapabilitiesInput,
  ): Promise<Capability[]> {
    const next: Capability[] = [];
    for (const capabilityId of [...new Set(input.capability_ids)]) {
      const capability = this.capabilityById.get(capabilityId);
      if (capability === undefined) {
        throw new Error(`IN_MEMORY_ROLE_CAPABILITY_UNKNOWN_ID:${capabilityId}`);
      }
      next.push(capability);
    }
    this.roleCapabilities.set(roleKey(tenantId, roleId), next);
    return [...next];
  }
}
