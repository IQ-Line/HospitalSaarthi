import { randomUUID } from "node:crypto";
import { InvalidRoleSeedError } from "../domain/errors.js";
import { normalizeRoleCode } from "../domain/normalize-role-code.js";
import { normalizeRoleType } from "../domain/normalize-role-type.js";
import type { CreateRoleInput, Role, RoleRepository, UpdateRoleInput } from "../ports/index.js";

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
      const role_type = normalizeRoleType(seed.role.role_type ?? seed.role.code);
      if (code.length === 0 || role_type.length === 0) {
        throw new InvalidRoleSeedError();
      }
      this.roles.set(roleKey(seed.tenantId, seed.role.id), {
        ...seed.role,
        code,
        role_type,
      });
    }
  }

  async getRoleById(tenantId: string, roleId: string): Promise<Role | null> {
    return this.roles.get(roleKey(tenantId, roleId)) ?? null;
  }

  async listRoles(tenantId: string): Promise<Role[]> {
    return [...this.roles.entries()]
      .filter(([key]) => key.startsWith(`${tenantId}:`))
      .map(([, role]) => role);
  }

  async listRolesByIds(tenantId: string, roleIds: string[]): Promise<Role[]> {
    return [...new Set(roleIds)]
      .map((roleId) => this.roles.get(roleKey(tenantId, roleId)) ?? null)
      .filter((role): role is Role => role !== null);
  }

  async createRole(tenantId: string, input: CreateRoleInput): Promise<Role> {
    const role: Role = {
      id: randomUUID(),
      code: normalizeRoleCode(input.code),
      role_type: normalizeRoleType(input.role_type),
      display_name: input.display_name,
      description: input.description ?? null,
      is_system: input.is_system ?? false,
      status: input.status ?? "active",
    };
    this.roles.set(roleKey(tenantId, role.id), role);
    return role;
  }

  async updateRole(tenantId: string, roleId: string, input: UpdateRoleInput): Promise<Role | null> {
    const role = this.roles.get(roleKey(tenantId, roleId));
    if (!role) return null;
    const next: Role = {
      ...role,
      ...(input.code !== undefined ? { code: normalizeRoleCode(input.code) } : {}),
      ...(input.role_type !== undefined ? { role_type: normalizeRoleType(input.role_type) } : {}),
      ...(input.display_name !== undefined ? { display_name: input.display_name } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.is_system !== undefined ? { is_system: input.is_system } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
    };
    this.roles.set(roleKey(tenantId, roleId), next);
    return next;
  }

  async deleteRole(tenantId: string, roleId: string): Promise<Role | null> {
    const key = roleKey(tenantId, roleId);
    const role = this.roles.get(key) ?? null;
    if (role) {
      this.roles.delete(key);
    }
    return role;
  }
}
