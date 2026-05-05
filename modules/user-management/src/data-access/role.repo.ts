import { eq, and } from "drizzle-orm";
import type { DbInstance } from "@hims/ts-sdk-db";
import type { RoleRepo } from "../ports.js";
import type {
  Role,
  CreateRoleData,
  RoleAssignment,
  AssignRoleData,
} from "../domain/role.types.js";
import { roles, roleAssignments } from "../schema/tables.js";

export class DrizzleRoleRepo implements RoleRepo {
  constructor(private readonly db: DbInstance) {}

  async findAll(tenantId: string): Promise<Role[]> {
    return this.db
      .select()
      .from(roles)
      .where(eq(roles.iq_tenant_id, tenantId)) as unknown as Promise<Role[]>;
  }

  async findById(tenantId: string, id: string): Promise<Role | undefined> {
    const rows = await this.db
      .select()
      .from(roles)
      .where(and(eq(roles.iq_tenant_id, tenantId), eq(roles.id, id)))
      .limit(1);

    return rows[0] as Role | undefined;
  }

  async create(data: CreateRoleData): Promise<Role> {
    const rows = await this.db
      .insert(roles)
      .values({
        iq_tenant_id: data.iq_tenant_id,
        name: data.name,
        display_name: data.display_name,
        description: data.description ?? null,
        scope_level: data.scope_level ?? "tenant",
        created_by: data.created_by ?? null,
        updated_by: data.created_by ?? null,
      })
      .returning();

    return rows[0] as Role;
  }

  async assignToUser(data: AssignRoleData): Promise<RoleAssignment> {
    const rows = await this.db
      .insert(roleAssignments)
      .values({
        iq_tenant_id: data.iq_tenant_id,
        user_id: data.user_id,
        role_id: data.role_id,
        scope_type: data.scope_type ?? null,
        scope_id: data.scope_id ?? null,
        assigned_by: data.assigned_by,
      })
      .returning();

    return rows[0] as RoleAssignment;
  }
}
