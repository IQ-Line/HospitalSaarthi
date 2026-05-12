import type { DbInstance } from "@hims/ts-sdk-db";
import { and, eq } from "drizzle-orm";
import type { AbacAttributeRepository } from "../ports/index.js";
import {
  delegated_capability_grants,
  role_assignments,
  role_permissions,
  roles,
  user_clearances,
} from "../schema/tables.js";

export class DrizzleAbacAttributeRepository implements AbacAttributeRepository {
  constructor(private readonly db: DbInstance) {}

  async listRolePermissionIdsForUser(tenantId: string, userId: string): Promise<string[]> {
    const rows = await this.db
      .select({ permission_id: role_permissions.permission_id })
      .from(role_assignments)
      .innerJoin(
        roles,
        and(
          eq(role_assignments.iq_tenant_id, roles.iq_tenant_id),
          eq(role_assignments.role_id, roles.id),
        ),
      )
      .innerJoin(
        role_permissions,
        and(
          eq(role_permissions.iq_tenant_id, roles.iq_tenant_id),
          eq(role_permissions.role_id, roles.id),
        ),
      )
      .where(
        and(
          eq(role_assignments.iq_tenant_id, tenantId),
          eq(role_assignments.user_id, userId),
        ),
      );

    const set = new Set<string>();
    for (const r of rows) set.add(r.permission_id);
    return [...set].sort();
  }

  async getClearances(tenantId: string, userId: string): Promise<Record<string, string>> {
    const rows = await this.db
      .select({
        clearance_key: user_clearances.clearance_key,
        access_level: user_clearances.access_level,
      })
      .from(user_clearances)
      .where(
        and(eq(user_clearances.iq_tenant_id, tenantId), eq(user_clearances.user_id, userId)),
      );

    const out: Record<string, string> = {};
    for (const r of rows) {
      out[r.clearance_key] = r.access_level;
    }
    return out;
  }

  async listDelegatedCapabilities(tenantId: string, userId: string): Promise<string[]> {
    const rows = await this.db
      .select({ capability: delegated_capability_grants.capability })
      .from(delegated_capability_grants)
      .where(
        and(
          eq(delegated_capability_grants.iq_tenant_id, tenantId),
          eq(delegated_capability_grants.delegatee_user_id, userId),
          eq(delegated_capability_grants.active, true),
        ),
      );

    const set = new Set<string>();
    for (const r of rows) {
      const c = r.capability.trim();
      if (c.length > 0) set.add(c);
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  }
}
