import { createDb, sql } from "@hims/ts-sdk-db";

const MASTER_GLOBAL = "master_global";

function readPgRows(result: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(result)) {
    return result as Array<Record<string, unknown>>;
  }
  if (result && typeof result === "object" && "rows" in result) {
    return (result as { rows: Array<Record<string, unknown>> }).rows;
  }
  return [];
}

function normalizePostgresUrl(url: string): string {
  return url.replace(/^postgresql\+psycopg:\/\//, "postgresql://");
}

export type ResolvedMasterDataCatalog = {
  moduleIdsBySlug: Map<string, string>;
};

/** Active L1 module UUIDs from `master_global.modules` (for Configurator `tenant_modules`). */
export async function resolveMasterDataModuleCatalog(
  masterDataDatabaseUrl: string,
): Promise<ResolvedMasterDataCatalog> {
  const db = createDb(normalizePostgresUrl(masterDataDatabaseUrl));
  const moduleIdsBySlug = new Map<string, string>();

  const result = await db.execute(sql.raw(`
    SELECT slug, id::text AS id
    FROM ${MASTER_GLOBAL}.modules
    WHERE NOT is_deleted
      AND is_active
      AND level = 1
    ORDER BY slug
  `));

  for (const row of readPgRows(result)) {
    const slug = row.slug;
    const id = row.id;
    if (typeof slug === "string" && typeof id === "string" && id.length > 0) {
      moduleIdsBySlug.set(slug, id);
    }
  }

  if (moduleIdsBySlug.size === 0) {
    throw new Error(
      `No active L1 modules in ${MASTER_GLOBAL}.modules — run master-data migrations first`,
    );
  }

  return { moduleIdsBySlug };
}
