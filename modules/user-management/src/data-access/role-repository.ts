import type { DbInstance } from "@hims/ts-sdk-db";
import { and, eq } from "drizzle-orm";
import type { Role, RoleRepository } from "../ports/index.js";
import { roles } from "../schema/tables.js";

function rowToRole(row: {
  id: string;
  code: string;
  display_name: string;
}): Role {
  return {
    id: row.id,
    code: row.code,
    display_name: row.display_name,
  };
}

const roleColumns = {
  id: roles.id,
  code: roles.code,
  display_name: roles.display_name,
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
}
