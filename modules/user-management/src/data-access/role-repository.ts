import type { DbInstance } from "@hims/ts-sdk-db";
import { and, eq, inArray } from "drizzle-orm";
import {
  DuplicateRoleCodeError,
  RoleInUseError,
  UnexpectedPersistenceError,
} from "../domain/errors.js";
import type { CreateRoleInput, Role, RoleRepository, UpdateRoleInput } from "../ports/index.js";
import { roles } from "../schema/tables.js";

function rowToRole(row: {
  id: string;
  code: string;
  display_name: string;
  description: string | null;
  is_system: boolean;
  status: string;
}): Role {
  return {
    id: row.id,
    code: row.code,
    display_name: row.display_name,
    description: row.description,
    is_system: row.is_system,
    status: row.status as Role["status"],
  };
}

function isPostgresUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: unknown }).code === "23505"
  );
}

function isPostgresForeignKeyViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: unknown }).code === "23503"
  );
}

const roleColumns = {
  id: roles.id,
  code: roles.code,
  display_name: roles.display_name,
  description: roles.description,
  is_system: roles.is_system,
  status: roles.status,
} as const;

export class DrizzleRoleRepository implements RoleRepository {
  constructor(private readonly db: DbInstance) {}

  async getRoleById(tenantId: string, roleId: string): Promise<Role | null> {
    const [row] = await this.db
      .select(roleColumns)
      .from(roles)
      .where(and(eq(roles.iq_tenant_id, tenantId), eq(roles.id, roleId)))
      .limit(1);

    return row ? rowToRole(row) : null;
  }

  async listRoles(tenantId: string): Promise<Role[]> {
    const rows = await this.db
      .select(roleColumns)
      .from(roles)
      .where(eq(roles.iq_tenant_id, tenantId));
    return rows.map(rowToRole);
  }

  async listRolesByIds(tenantId: string, roleIds: string[]): Promise<Role[]> {
    const uniqueRoleIds = [...new Set(roleIds)];
    if (uniqueRoleIds.length === 0) {
      return [];
    }

    const rows = await this.db
      .select(roleColumns)
      .from(roles)
      .where(and(eq(roles.iq_tenant_id, tenantId), inArray(roles.id, uniqueRoleIds)));

    const rowsById = new Map(rows.map((row) => [row.id, rowToRole(row)]));
    return uniqueRoleIds
      .map((roleId) => rowsById.get(roleId) ?? null)
      .filter((role): role is Role => role !== null);
  }

  async createRole(tenantId: string, input: CreateRoleInput): Promise<Role> {
    try {
      const [row] = await this.db
        .insert(roles)
        .values({
          iq_tenant_id: tenantId,
          code: input.code,
          display_name: input.display_name,
          description: input.description ?? null,
          is_system: input.is_system ?? false,
          status: input.status ?? "active",
        })
        .returning(roleColumns);

      if (!row) {
        throw new UnexpectedPersistenceError();
      }
      return rowToRole(row);
    } catch (error) {
      if (isPostgresUniqueViolation(error)) {
        throw new DuplicateRoleCodeError(input.code);
      }
      throw error;
    }
  }

  async updateRole(tenantId: string, roleId: string, input: UpdateRoleInput): Promise<Role | null> {
    const patch: Partial<{
      code: string;
      display_name: string;
      description: string | null;
      is_system: boolean;
      status: Role["status"];
      updated_at: Date;
    }> = {};

    if (input.code !== undefined) patch.code = input.code;
    if (input.display_name !== undefined) patch.display_name = input.display_name;
    if (input.description !== undefined) patch.description = input.description;
    if (input.is_system !== undefined) patch.is_system = input.is_system;
    if (input.status !== undefined) patch.status = input.status;

    if (Object.keys(patch).length === 0) {
      return this.getRoleById(tenantId, roleId);
    }

    patch.updated_at = new Date();

    try {
      const [row] = await this.db
        .update(roles)
        .set(patch)
        .where(and(eq(roles.iq_tenant_id, tenantId), eq(roles.id, roleId)))
        .returning(roleColumns);
      return row ? rowToRole(row) : null;
    } catch (error) {
      if (isPostgresUniqueViolation(error)) {
        throw new DuplicateRoleCodeError(input.code);
      }
      throw error;
    }
  }

  async deleteRole(tenantId: string, roleId: string): Promise<Role | null> {
    try {
      const [row] = await this.db
        .delete(roles)
        .where(and(eq(roles.iq_tenant_id, tenantId), eq(roles.id, roleId)))
        .returning(roleColumns);
      return row ? rowToRole(row) : null;
    } catch (error) {
      if (isPostgresForeignKeyViolation(error)) {
        throw new RoleInUseError(roleId);
      }
      throw error;
    }
  }
}
