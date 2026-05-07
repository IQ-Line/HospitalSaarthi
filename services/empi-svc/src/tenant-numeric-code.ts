import { sql } from "drizzle-orm";
import type { DbInstance } from "@hims/ts-sdk-db";

type NumericCodeRow = { iq_tenant_id: string; tenant_numeric_code: string | null };

function deriveNumericCode(tenantId: string): string {
  // Deterministic fallback: stable 5-digit code from UUID/string.
  // This is only for dev safety if Configurator data is unavailable.
  let hash = 0;
  for (let i = 0; i < tenantId.length; i += 1) {
    hash = (hash * 31 + tenantId.charCodeAt(i)) >>> 0;
  }
  return String(hash % 100000).padStart(5, "0");
}

async function loadFromConfiguratorTenants(db: DbInstance): Promise<Map<string, string>> {
  // Preferred: configurator.tenants.tenant_numeric_code (as per EMPI LLD).
  try {
    const rows = (await db.execute(
      sql`select iq_tenant_id, tenant_numeric_code from configurator.tenants`,
    )) as unknown as NumericCodeRow[];

    const map = new Map<string, string>();
    for (const r of rows) {
      if (r.iq_tenant_id && r.tenant_numeric_code) {
        map.set(r.iq_tenant_id, String(r.tenant_numeric_code).padStart(5, "0"));
      }
    }
    return map;
  } catch {
    // Some environments may not have the column yet; fall back to metadata JSON pattern.
  }

  try {
    const rows = (await db.execute(
      sql`select iq_tenant_id, (metadata->>'tenant_numeric_code') as tenant_numeric_code from configurator.tenants`,
    )) as unknown as NumericCodeRow[];

    const map = new Map<string, string>();
    for (const r of rows) {
      if (r.iq_tenant_id && r.tenant_numeric_code) {
        map.set(r.iq_tenant_id, String(r.tenant_numeric_code).padStart(5, "0"));
      }
    }
    return map;
  } catch {
    return new Map();
  }
}

export async function createTenantNumericCodeResolver(db: DbInstance): Promise<(tenantId: string) => string> {
  const cache = await loadFromConfiguratorTenants(db);

  return (tenantId: string) => {
    const existing = cache.get(tenantId);
    if (existing) return existing;

    const derived = deriveNumericCode(tenantId);
    cache.set(tenantId, derived);
    return derived;
  };
}

