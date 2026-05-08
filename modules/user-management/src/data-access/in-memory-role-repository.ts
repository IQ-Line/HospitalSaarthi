import { InvalidRoleSeedError } from "../domain/errors.js";
import { normalizeRoleCode } from "../domain/normalize-role-code.js";
import type { Role, RoleRepository } from "../ports/index.js";

type SeedRole = {
  tenantId: string;
  role: Role;
};

function roleKey(tenantId: string, roleId: string): string {
  return `${tenantId}:${roleId}`;
}

/** In-memory {@link RoleRepository} keyed by `tenantId:roleId`. */
export class InMemoryRoleRepository implements RoleRepository {
  private readonly roles = new Map<string, Role>();

  constructor(seedRoles: SeedRole[] = []) {
    for (const seed of seedRoles) {
      const code = normalizeRoleCode(seed.role.code);
      if (code.length === 0) {
        throw new InvalidRoleSeedError();
      }
      this.roles.set(roleKey(seed.tenantId, seed.role.id), { ...seed.role, code });
    }
  }

  async getRoleById(tenantId: string, roleId: string): Promise<Role | null> {
    return this.roles.get(roleKey(tenantId, roleId)) ?? null;
  }
}
