import { eq, type SQL, and } from "drizzle-orm";
import type { PgColumn, PgSelectQueryBuilder } from "drizzle-orm/pg-core";

/**
 * Appends `WHERE iq_tenant_id = tenantId` (or ANDs it into an existing WHERE)
 * to any Drizzle PgSelect-style query builder.
 *
 * Usage:
 *   const rows = await withTenant(
 *     db.select().from(visits).$dynamic(),
 *     visits.iq_tenant_id,
 *     tenantId,
 *   );
 */
export function withTenant<T extends PgSelectQueryBuilder>(
  qb: T,
  tenantCol: PgColumn,
  tenantId: string,
): T {
  return qb.where(eq(tenantCol, tenantId)) as T;
}

/**
 * Builds a standalone `iq_tenant_id = ?` SQL condition for use in
 * manual WHERE clauses, update filters, or delete filters.
 */
export function tenantFilter(
  tenantCol: PgColumn,
  tenantId: string,
): SQL {
  return eq(tenantCol, tenantId);
}

/**
 * Combines a tenant filter with additional conditions via AND.
 */
export function tenantAnd(
  tenantCol: PgColumn,
  tenantId: string,
  ...conditions: (SQL | undefined)[]
): SQL {
  return and(eq(tenantCol, tenantId), ...conditions)!;
}
