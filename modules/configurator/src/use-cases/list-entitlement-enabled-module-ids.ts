import { and, eq, inArray, sql, type DbInstance } from "@hims/ts-sdk-db";
import { tenantModules } from "../schema/tables.js";

export type EntitlementEnabledModuleRow = {
  module_id: string;
  is_active: boolean;
};

function readRows<T>(result: unknown): T[] {
  if (Array.isArray(result)) {
    return result as T[];
  }
  return ((result as { rows?: T[] }).rows ?? []) as T[];
}

/**
 * Returns tenant module ids that exist in `master_global.modules` (non-deleted).
 * Side-effect: deactivates active rows whose `module_id` is missing from the catalog
 * (orphan / wrong-environment UUID) so UM entitlement hydration cannot fail-closed.
 *
 * Citus: UPDATE must not use a `master_global` subquery — select orphan ids first,
 * then update `tenant_modules` by `(iq_tenant_id, module_id)` only.
 */
export async function listEntitlementEnabledModuleIds(
  db: DbInstance,
  iqTenantId: string,
): Promise<EntitlementEnabledModuleRow[]> {
  const orphanResult = await db.execute(sql`
    SELECT tm.module_id
    FROM configurator.tenant_modules AS tm
    WHERE tm.iq_tenant_id = ${iqTenantId}
      AND tm.is_active = true
      AND NOT EXISTS (
        SELECT 1
        FROM master_global.modules AS m
        WHERE m.id = tm.module_id
          AND m.is_deleted = false
      )
  `);

  const orphanIds = readRows<{ module_id: string }>(orphanResult)
    .map((row) => row.module_id)
    .filter((id) => typeof id === "string" && id.length > 0);

  if (orphanIds.length > 0) {
    await db
      .update(tenantModules)
      .set({
        is_core_override: false,
        is_active: false,
        updated_at: new Date(),
      })
      .where(
        and(
          eq(tenantModules.iq_tenant_id, iqTenantId),
          inArray(tenantModules.module_id, orphanIds),
        ),
      );
  }

  const result = await db.execute(sql`
    SELECT tm.module_id, tm.is_active
    FROM configurator.tenant_modules AS tm
    INNER JOIN master_global.modules AS m
      ON m.id = tm.module_id
      AND m.is_deleted = false
    WHERE tm.iq_tenant_id = ${iqTenantId}
      AND tm.is_active = true
  `);

  return readRows<{ module_id: string; is_active: boolean }>(result).map((row) => ({
    module_id: row.module_id,
    is_active: row.is_active,
  }));
}
