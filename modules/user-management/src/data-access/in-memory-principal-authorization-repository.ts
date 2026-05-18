import type { PrincipalAuthorizationRepository } from "../ports/index.js";

function tenantUser(tenantId: string, userId: string): string {
  return `${tenantId}\0${userId}`;
}

/**
 * Dev/test adapter for principal enrichment inputs.
 * Stores effective capability keys, delegated capability keys, and clearance levels per user.
 */
export class InMemoryPrincipalAuthorizationRepository implements PrincipalAuthorizationRepository {
  private readonly effectiveCapabilities = new Map<string, Set<string>>();
  private readonly delegatedCapabilities = new Map<string, Set<string>>();
  private readonly clearances = new Map<string, Record<string, string>>();

  seedCapability(tenantId: string, userId: string, capabilityKey: string): void {
    const key = tenantUser(tenantId, userId);
    let set = this.effectiveCapabilities.get(key);
    if (!set) {
      set = new Set();
      this.effectiveCapabilities.set(key, set);
    }
    set.add(capabilityKey);
  }

  seedDelegatedCapability(tenantId: string, userId: string, capabilityKey: string): void {
    const key = tenantUser(tenantId, userId);
    let set = this.delegatedCapabilities.get(key);
    if (!set) {
      set = new Set();
      this.delegatedCapabilities.set(key, set);
    }
    set.add(capabilityKey);
  }

  seedClearance(
    tenantId: string,
    userId: string,
    clearanceKey: string,
    clearanceLevel: string,
  ): void {
    const key = tenantUser(tenantId, userId);
    const current = this.clearances.get(key) ?? {};
    this.clearances.set(key, { ...current, [clearanceKey]: clearanceLevel });
  }

  async listEffectiveCapabilityKeys(tenantId: string, userId: string): Promise<string[]> {
    const set = this.effectiveCapabilities.get(tenantUser(tenantId, userId));
    if (!set) return [];
    return [...set].sort((a, b) => a.localeCompare(b));
  }

  async getClearanceLevels(tenantId: string, userId: string): Promise<Record<string, string>> {
    return { ...(this.clearances.get(tenantUser(tenantId, userId)) ?? {}) };
  }

  async listDelegatedCapabilityKeys(tenantId: string, userId: string): Promise<string[]> {
    const set = this.delegatedCapabilities.get(tenantUser(tenantId, userId));
    if (!set) return [];
    return [...set].sort((a, b) => a.localeCompare(b));
  }
}
