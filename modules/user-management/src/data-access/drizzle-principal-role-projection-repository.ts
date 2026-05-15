import type { DbInstance } from "@hims/ts-sdk-db";
import { and, eq } from "drizzle-orm";
import type { PrincipalRoleProjectionRepository } from "../ports/index.js";
import { role_assignments, roles } from "../schema/tables.js";

function projectionCacheKey(tenantId: string, userId: string): string {
  return `${tenantId}\0${userId}`;
}

/**
 * One query: assignments for (tenant, user) INNER JOIN roles on composite tenant + role id.
 * Orphan assignments (no matching role row) are excluded, matching prior per-row getRoleById null-skip.
 * Future: add LEFT JOIN capability/grant tables here — still one round-trip.
 */
export class DrizzlePrincipalRoleProjectionRepository implements PrincipalRoleProjectionRepository {
  private readonly projectionCache = new Map<string, string[]>();

  constructor(private readonly db: DbInstance) {}

  clearCache(): void {
    this.projectionCache.clear();
  }

  async listRoleCodesByUser(tenantId: string, userId: string): Promise<string[]> {
    const key = projectionCacheKey(tenantId, userId);
    const cached = this.projectionCache.get(key);
    if (cached !== undefined) {
      return [...cached];
    }

    const rows = await this.db
      .select({ code: roles.code })
      .from(role_assignments)
      .innerJoin(
        roles,
        and(
          eq(role_assignments.iq_tenant_id, roles.iq_tenant_id),
          eq(role_assignments.role_id, roles.id),
        ),
      )
      .where(
        and(
          eq(role_assignments.iq_tenant_id, tenantId),
          eq(role_assignments.user_id, userId),
        ),
      );

    const codes = rows.map((r) => r.code);
    this.projectionCache.set(key, [...codes]);
    return [...codes];
  }
}
