import { sql, type DbInstance } from "@hims/ts-sdk-db";

export type EntitlementEnabledModuleRow = {
  module_id: string;
  is_active: boolean;
};

/**
 * Returns tenant module ids that exist in `global_master.modules` (non-deleted).
 * Side-effect: deactivates active rows whose `module_id` is missing from the catalog
 * (orphan / wrong-environment UUID) so UM entitlement hydration cannot fail-closed.
 */
export async function listEntitlementEnabledModuleIds(
  db: DbInstance,
  iqTenantId: string,
): Promise<EntitlementEnabledModuleRow[]> {
  await db.execute(sql`
    UPDATE configurator.tenant_modules AS tm
    SET
      is_core_override = false,
      is_active = false,
      updated_at = now()
    WHERE tm.iq_tenant_id = ${iqTenantId}
      AND tm.is_active = true
      AND NOT EXISTS (
        SELECT 1
        FROM global_master.modules AS m
        WHERE m.id = tm.module_id
          AND m.is_deleted = false
      )
  `);

  const result = await db.execute(sql`
    SELECT tm.module_id, tm.is_active
    FROM configurator.tenant_modules AS tm
    INNER JOIN global_master.modules AS m
      ON m.id = tm.module_id
      AND m.is_deleted = false
    WHERE tm.iq_tenant_id = ${iqTenantId}
      AND tm.is_active = true
  `);

  const rows = Array.isArray(result)
    ? result
    : ((result as { rows?: Array<{ module_id: string; is_active: boolean }> }).rows ?? []);

  return rows.map((row) => ({
    module_id: row.module_id,
    is_active: row.is_active,
  }));
}
