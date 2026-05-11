import type { AbacAttributeRepository } from "../ports/index.js";

function tenantUser(tenantId: string, userId: string): string {
  return `${tenantId}\0${userId}`;
}

/**
 * Dev/test adapter: in-process ABAC attribute stores (empty by default).
 * Not a substitute for `role_capabilities` in production — never embed a static role→capability
 * map here; call `seedRoleCapability` explicitly per test scenario.
 */
export class InMemoryAbacAttributeRepository implements AbacAttributeRepository {
  private readonly roleCaps = new Map<string, Set<string>>();
  private readonly clearances = new Map<string, Record<string, string>>();
  private readonly delegated = new Map<string, Set<string>>();

  /** Test helper: grant a capability via persisted role-capability path. */
  seedRoleCapability(tenantId: string, userId: string, capability: string): void {
    const key = tenantUser(tenantId, userId);
    let set = this.roleCaps.get(key);
    if (!set) {
      set = new Set();
      this.roleCaps.set(key, set);
    }
    set.add(capability);
  }

  async listRoleCapabilitiesForUser(tenantId: string, userId: string): Promise<string[]> {
    const set = this.roleCaps.get(tenantUser(tenantId, userId));
    if (!set) return [];
    return [...set].sort((a, b) => a.localeCompare(b));
  }

  async getClearances(tenantId: string, userId: string): Promise<Record<string, string>> {
    return { ...(this.clearances.get(tenantUser(tenantId, userId)) ?? {}) };
  }

  async listDelegatedCapabilities(tenantId: string, userId: string): Promise<string[]> {
    const set = this.delegated.get(tenantUser(tenantId, userId));
    if (!set) return [];
    return [...set].sort((a, b) => a.localeCompare(b));
  }
}
