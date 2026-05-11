import type { DbInstance } from "@hims/ts-sdk-db";
import { sql } from "@hims/ts-sdk-db";

/**
 * Reads `configurator.tenants.tenant_numeric_code` for UHID segment TTTTT (5 digits).
 * On missing table/column/row, uses `EMPI_FALLBACK_TENANT_NUMERIC_CODE` (default `00001`).
 *
 * Requires `tenant_numeric_code` column on `configurator.tenants` (Configurator migration).
 */
export function createTenantNumericCodeLookup(db: DbInstance) {
  //keeping this fallback for now as right now communication between empi and configurator is not yet established
  const fallback = normalizeFiveDigit(
    process.env["EMPI_FALLBACK_TENANT_NUMERIC_CODE"] ?? "00001",
  );

  return async function getTenantNumericCode(tenantId: string): Promise<string> {
    try {
      const result = await db.execute(
        sql`SELECT tenant_numeric_code FROM configurator.tenants WHERE iq_tenant_id = ${tenantId} LIMIT 1`,
      );
      const rows = (
        result as unknown as {
          rows: Array<{ tenant_numeric_code: unknown }>;
        }
      ).rows;
      const raw = rows?.[0]?.tenant_numeric_code;
      if (raw == null || raw === "") {
        return fallback;
      }
      return normalizeFiveDigit(String(raw));
    } catch {
      return fallback;
    }
  };
}

function normalizeFiveDigit(code: string): string {
  const digits = String(code).replace(/\D/g, "");
  if (!digits) return "00001";
  return digits.slice(-5).padStart(5, "0");
}
