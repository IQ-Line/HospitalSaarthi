import type { DbInstance } from "@hims/ts-sdk-db";
import { and, eq, gt, isNull, lte, or } from "drizzle-orm";
import type { PrincipalAuthorizationRepository } from "../ports/index.js";
import {
  capabilities,
  delegated_capability_grants,
  role_assignments,
  role_capabilities,
  user_clearances,
} from "../schema/tables.js";

export class DrizzlePrincipalAuthorizationRepository implements PrincipalAuthorizationRepository {
  constructor(private readonly db: DbInstance) {}

  async listEffectiveCapabilityKeys(tenantId: string, userId: string): Promise<string[]> {
    const rows = await this.db
      .select({ capability_key: capabilities.capability_key })
      .from(role_assignments)
      .innerJoin(
        role_capabilities,
        and(
          eq(role_capabilities.iq_tenant_id, role_assignments.iq_tenant_id),
          eq(role_capabilities.role_id, role_assignments.role_id),
        ),
      )
      .innerJoin(capabilities, eq(role_capabilities.capability_id, capabilities.id))
      .where(
        and(
          eq(role_assignments.iq_tenant_id, tenantId),
          eq(role_assignments.user_id, userId),
        ),
      );

    return [...new Set(rows.map((row) => row.capability_key.trim()).filter(Boolean))].sort(
      (a, b) => a.localeCompare(b),
    );
  }

  async getClearanceLevels(tenantId: string, userId: string): Promise<Record<string, string>> {
    const rows = await this.db
      .select({
        clearance_key: user_clearances.clearance_key,
        clearance_level: user_clearances.clearance_level,
      })
      .from(user_clearances)
      .where(
        and(eq(user_clearances.iq_tenant_id, tenantId), eq(user_clearances.user_id, userId)),
      );

    const out: Record<string, string> = {};
    for (const row of rows) {
      out[row.clearance_key] = row.clearance_level;
    }
    return out;
  }

  async listDelegatedCapabilityKeys(tenantId: string, userId: string): Promise<string[]> {
    const now = new Date();
    const rows = await this.db
      .select({ capability_key: capabilities.capability_key })
      .from(delegated_capability_grants)
      .innerJoin(capabilities, eq(delegated_capability_grants.capability_id, capabilities.id))
      .where(
        and(
          eq(delegated_capability_grants.iq_tenant_id, tenantId),
          eq(delegated_capability_grants.target_user_id, userId),
          eq(delegated_capability_grants.status, "active"),
          lte(delegated_capability_grants.starts_at, now),
          or(
            isNull(delegated_capability_grants.ends_at),
            gt(delegated_capability_grants.ends_at, now),
          ),
        ),
      );

    return [...new Set(rows.map((row) => row.capability_key.trim()).filter(Boolean))].sort(
      (a, b) => a.localeCompare(b),
    );
  }
}
