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

  constructor(seed: SeedRoleCapabilities[] = []) {
    for (const entry of seed) {
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
    const current = this.roleCapabilities.get(roleKey(tenantId, roleId)) ?? [];
    const allowed = new Set(input.capability_ids);
    const next = current.filter((capability) => allowed.has(capability.id));
    this.roleCapabilities.set(roleKey(tenantId, roleId), next);
    return [...next];
  }
}
