import { createDb, sql } from "../../packages/ts-sdk-db/src/index.ts";
import { SEED_MODULES, SEED_PERMISSIONS } from "./constants.ts";
import { seedLog } from "./log.ts";
import { normalizePostgresUrl } from "./load-env.ts";

const GLOBAL_MASTER = "global_master";

function readPgRows(result: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(result)) {
    return result as Array<Record<string, unknown>>;
  }
  if (result && typeof result === "object" && "rows" in result) {
    return (result as { rows: Array<Record<string, unknown>> }).rows;
  }
  return [];
}

export type MasterDataSeedResult = {
  modules: number;
  permissions: number;
  module_permissions: number;
  moduleIdsBySlug: Map<string, string>;
};

function escapeLiteral(value: string): string {
  return value.replace(/'/g, "''");
}

export async function seedMasterData(databaseUrl: string): Promise<MasterDataSeedResult> {
  const db = createDb(normalizePostgresUrl(databaseUrl));
  const moduleIdsBySlug = new Map<string, string>();

  await db.transaction(async (tx) => {
    for (const mod of SEED_MODULES) {
      const description = escapeLiteral(mod.description);
      if (mod.id) {
        await tx.execute(sql.raw(`
          INSERT INTO ${GLOBAL_MASTER}.modules (
            id, parent_id, name, slug, description, category, version, level,
            is_active, is_deleted, created_at, updated_at
          )
          SELECT
            '${mod.id}'::uuid,
            NULL,
            '${escapeLiteral(mod.name)}',
            '${mod.slug}',
            '${description}',
            '${mod.category}',
            '1.0.0',
            ${mod.level},
            true,
            false,
            now(),
            now()
          WHERE NOT EXISTS (
            SELECT 1 FROM ${GLOBAL_MASTER}.modules
            WHERE slug = '${mod.slug}' AND NOT is_deleted
          )
        `));
      }

      const resolved = await tx.execute(sql.raw(`
        SELECT id::text AS id
        FROM ${GLOBAL_MASTER}.modules
        WHERE slug = '${mod.slug}' AND NOT is_deleted
        LIMIT 1
      `));
      const rows = readPgRows(resolved);
      const moduleId = rows[0]?.id;
      if (typeof moduleId !== "string" || moduleId.length === 0) {
        throw new Error(
          `Module slug "${mod.slug}" not found in ${GLOBAL_MASTER}.modules — run master-data migrations first`,
        );
      }
      moduleIdsBySlug.set(mod.slug, moduleId);
    }

    for (const perm of SEED_PERMISSIONS) {
      await tx.execute(sql.raw(`
        INSERT INTO ${GLOBAL_MASTER}.permissions (
          id, name, slug, action, description, is_active, is_deleted, created_at, updated_at
        )
        SELECT
          '${perm.id}'::uuid,
          '${escapeLiteral(perm.name)}',
          '${perm.slug}',
          '${perm.action}',
          'Dev seed permission (${perm.slug}).',
          true,
          false,
          now(),
          now()
        WHERE NOT EXISTS (
          SELECT 1 FROM ${GLOBAL_MASTER}.permissions
          WHERE slug = '${perm.slug}' AND NOT is_deleted
        )
      `));
    }

    let modulePermissionCount = 0;
    for (const perm of SEED_PERMISSIONS) {
      const mpId = perm.id;
      await tx.execute(sql.raw(`
        INSERT INTO ${GLOBAL_MASTER}.module_permissions (
          id, slug, module_id, permission_id, is_default, is_active, is_deleted, created_at, updated_at
        )
        SELECT
          '${mpId}'::uuid,
          '${escapeLiteral(perm.slug)}',
          m.id,
          p.id,
          false,
          true,
          false,
          now(),
          now()
        FROM ${GLOBAL_MASTER}.permissions p
        INNER JOIN ${GLOBAL_MASTER}.modules m
          ON m.slug = '${perm.moduleSlug}' AND NOT m.is_deleted
        WHERE p.slug = '${perm.slug}' AND NOT p.is_deleted
          AND NOT EXISTS (
            SELECT 1 FROM ${GLOBAL_MASTER}.module_permissions mp
            WHERE mp.module_id = m.id
              AND mp.permission_id = p.id
              AND NOT mp.is_deleted
          )
      `));
      modulePermissionCount += 1;
    }

    seedLog("master-data", "global_master catalog seed committed", {
      modules: moduleIdsBySlug.size,
      permissions: SEED_PERMISSIONS.length,
      module_permissions: modulePermissionCount,
    });
  });

  return {
    modules: moduleIdsBySlug.size,
    permissions: SEED_PERMISSIONS.length,
    module_permissions: SEED_PERMISSIONS.length,
    moduleIdsBySlug,
  };
}
