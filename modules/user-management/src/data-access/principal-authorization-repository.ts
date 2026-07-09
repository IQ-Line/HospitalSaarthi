import type { DbInstance } from "@hims/ts-sdk-db";
import { and, eq, gt, isNull, lte, notExists, or, sql } from "drizzle-orm";
import { union } from "drizzle-orm/pg-core";
import type { PrincipalAuthorizationRepository } from "../ports/index.js";
import {
  capabilities,
  delegated_capability_grants,
  role_capabilities,
  user_capabilities,
  user_clearances,
  user_roles,
} from "../schema/tables.js";

export class DrizzlePrincipalAuthorizationRepository implements PrincipalAuthorizationRepository {
  constructor(private readonly db: DbInstance) {}

  /**
   * Effective capability keys via live resolution (ADR-0037, supersedes the ADR-0031 snapshot read):
   *
   *   effective = (role_capabilities ⨝ user_roles) ∪ grant-overrides,  EXCEPT deny-overrides
   *
   * Role capabilities are read live (a role edit is visible to every assigned user next request,
   * no re-apply step); `user_capabilities` is exclusively the per-user grant/deny override table.
   * Deny wins over both role-derived and grant-override capabilities. One round-trip: a UNION
   * subquery of the two additive sources, filtered by a correlated `NOT EXISTS` deny check.
   */
  async listEffectiveCapabilityKeys(tenantId: string, userId: string): Promise<string[]> {
    const roleDerived = this.db
      .select({ capability_id: role_capabilities.capability_id })
      .from(role_capabilities)
      .innerJoin(
        user_roles,
        and(
          eq(user_roles.iq_tenant_id, role_capabilities.iq_tenant_id),
          eq(user_roles.role_id, role_capabilities.role_id),
        ),
      )
      .where(and(eq(user_roles.iq_tenant_id, tenantId), eq(user_roles.user_id, userId)));

    const grantOverrides = this.db
      .select({ capability_id: user_capabilities.capability_id })
      .from(user_capabilities)
      .where(
        and(
          eq(user_capabilities.iq_tenant_id, tenantId),
          eq(user_capabilities.user_id, userId),
          eq(user_capabilities.effect, "grant"),
        ),
      );

    const additive = union(roleDerived, grantOverrides).as("additive");

    const rows = await this.db
      .select({ capability_key: capabilities.capability_key })
      .from(additive)
      .innerJoin(capabilities, eq(capabilities.id, additive.capability_id))
      .where(
        notExists(
          this.db
            .select({ one: sql`1` })
            .from(user_capabilities)
            .where(
              and(
                eq(user_capabilities.iq_tenant_id, tenantId),
                eq(user_capabilities.user_id, userId),
                eq(user_capabilities.effect, "deny"),
                eq(user_capabilities.capability_id, additive.capability_id),
              ),
            ),
        ),
      );

    const keys = new Set<string>();
    for (const row of rows) {
      const key = row.capability_key.trim();
      if (key.length > 0) {
        keys.add(key);
      }
    }

    return [...keys].sort((a, b) => a.localeCompare(b));
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

  /**
   * Active delegated capability keys, minus any capability the user has a `deny` override on.
   * Deny wins over delegation too (ADR-0037): the Cerbos principal ORs `capabilities` and
   * `delegated_capabilities`, so a deny missing from either array is a silent bypass.
   */
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
          notExists(
            this.db
              .select({ one: sql`1` })
              .from(user_capabilities)
              .where(
                and(
                  eq(user_capabilities.iq_tenant_id, tenantId),
                  eq(user_capabilities.user_id, userId),
                  eq(user_capabilities.effect, "deny"),
                  eq(user_capabilities.capability_id, delegated_capability_grants.capability_id),
                ),
              ),
          ),
        ),
      );

    return [...new Set(rows.map((row) => row.capability_key.trim()).filter(Boolean))].sort(
      (a, b) => a.localeCompare(b),
    );
  }
}
