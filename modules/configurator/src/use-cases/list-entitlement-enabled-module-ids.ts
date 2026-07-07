import { and, eq, inArray, sql, type DbInstance } from "@hims/ts-sdk-db";
import type { PlatformModuleCatalogPort } from "../ports.js";
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
 * Returns the tenant's ACTIVE module ids that exist in Master Data's global module catalog
 * (non-deleted). Side-effect: deactivates active rows whose `module_id` is absent from the catalog
 * (orphan / wrong-environment UUID / soft-deleted) so UM entitlement hydration cannot fail-closed on
 * a stale id.
 *
 * The catalog is fetched over HTTP via {@link PlatformModuleCatalogPort} (decision D3 — the
 * Configurator never queries `master_data.*` directly), authoritatively (no cache; see the adapter).
 * Two fail-closed properties are load-bearing because `is_active = false` is STICKY — the SELECT
 * below only reads `is_active = true` rows, so a deactivated row is never revisited and a wrong
 * deactivation is PERMANENT:
 *
 *  - A catalog FETCH FAILURE fails loud: the adapter throws on a non-2xx / malformed response; that
 *    propagates here (→ 5xx) instead of returning an empty set.
 *  - An authoritatively EMPTY catalog while the tenant has active modules is treated as corrupt /
 *    misconfigured data (a healthy platform catalog is never empty) — we THROW rather than
 *    mass-deactivate every module. A populated catalog that merely lacks THIS tenant's ids is a
 *    genuine all-orphaned tenant and IS deactivated.
 *
 * Citus: the deactivation UPDATE keys on `(iq_tenant_id, module_id)` only (no cross-schema subquery).
 */
export async function listEntitlementEnabledModuleIds(
  db: DbInstance,
  catalog: PlatformModuleCatalogPort,
  iqTenantId: string,
): Promise<EntitlementEnabledModuleRow[]> {
  const activeResult = await db.execute(sql`
    SELECT tm.module_id, tm.is_active
    FROM configurator.tenant_modules AS tm
    WHERE tm.iq_tenant_id = ${iqTenantId}
      AND tm.is_active = true
  `);

  const activeRows = readRows<{ module_id: string; is_active: boolean }>(activeResult).filter(
    (row) => typeof row.module_id === "string" && row.module_id.length > 0,
  );
  if (activeRows.length === 0) {
    return [];
  }

  const validIds = await catalog.listValidModuleIds();

  // Fail-closed floor: a healthy platform catalog is never empty. An authoritatively empty catalog
  // while this tenant HAS active modules means corrupt / misconfigured data (wrong or unseeded
  // master-data DB, env drift) — refuse to mass-deactivate every module; fail loud so UM retries.
  if (validIds.size === 0) {
    throw new Error(
      `Platform module catalog is empty while tenant ${iqTenantId} has ${activeRows.length} ` +
        "active module(s); refusing to mass-deactivate (fail-closed).",
    );
  }

  const orphanIds = activeRows
    .map((row) => row.module_id)
    .filter((moduleId) => !validIds.has(moduleId));

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

  return activeRows
    .filter((row) => validIds.has(row.module_id))
    .map((row) => ({ module_id: row.module_id, is_active: row.is_active }));
}
