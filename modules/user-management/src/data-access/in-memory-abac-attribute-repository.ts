import type { AbacAttributeRepository } from "../ports/index.js";

function tenantUser(tenantId: string, userId: string): string {
  return `${tenantId}\0${userId}`;
}

/**
 * Dev/test adapter: in-process ABAC attribute stores (empty by default).
 * Not a substitute for `role_permissions` in production — never embed a static role→permission
 * map here; call `seedRolePermissionSlug` explicitly per test scenario.
 */
export class InMemoryAbacAttributeRepository implements AbacAttributeRepository {
  private readonly rolePerms = new Map<string, Set<string>>();
  private readonly clearances = new Map<string, Record<string, string>>();
  private readonly delegated = new Map<string, Set<string>>();

  /** Test helper: grant a permission slug via persisted role-permission path (e.g. "um:user:create"). */
  seedRolePermissionSlug(tenantId: string, userId: string, permissionSlug: string): void {
    const key = tenantUser(tenantId, userId);
    let set = this.rolePerms.get(key);
    if (!set) {
      set = new Set();
      this.rolePerms.set(key, set);
    }
    set.add(permissionSlug);
  }

  async listRolePermissionSlugsForUser(tenantId: string, userId: string): Promise<string[]> {
    const set = this.rolePerms.get(tenantUser(tenantId, userId));
    if (!set) return [];
    return [...set].sort();
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
