import type { DbInstance } from "@hims/ts-sdk-db";
import { and, eq } from "drizzle-orm";
import type { PrincipalRoleProjectionRepository } from "../ports/index.js";
import { roles, user_roles } from "../schema/tables.js";

function projectionCacheKey(tenantId: string, userId: string): string {
  return `${tenantId}\0${userId}`;
}

/**
 * One query: applied user role templates for (tenant, user) INNER JOIN roles on composite tenant + role id.
 * Orphan template links (no matching role row) are excluded, matching prior per-row getRoleById null-skip.
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
      .from(user_roles)
      .innerJoin(
        roles,
        and(
          eq(user_roles.iq_tenant_id, roles.iq_tenant_id),
          eq(user_roles.role_id, roles.id),
        ),
      )
      .where(
        and(
          eq(user_roles.iq_tenant_id, tenantId),
          eq(user_roles.user_id, userId),
        ),
      );

    const codes = rows.map((r) => r.code);
    this.projectionCache.set(key, [...codes]);
    return [...codes];
  }
}
