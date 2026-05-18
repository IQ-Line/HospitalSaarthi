import { createDb, sql } from "../../packages/ts-sdk-db/src/index.ts";
import { SEED_MODULES, SEED_PERMISSIONS } from "./constants.ts";
import { seedLog } from "./log.ts";
import { normalizePostgresUrl } from "./load-env.ts";

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
      await tx.execute(sql.raw(`
        INSERT INTO public.modules (
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
          1,
          true,
          false,
          now(),
          now()
        WHERE NOT EXISTS (
          SELECT 1 FROM public.modules
          WHERE slug = '${mod.slug}' AND NOT is_deleted
        )
      `));

      const resolved = await tx.execute(sql.raw(`
        SELECT id::text AS id
        FROM public.modules
        WHERE slug = '${mod.slug}' AND NOT is_deleted
        LIMIT 1
      `));
      const rows = readPgRows(resolved);
      const moduleId = rows[0]?.id;
      if (typeof moduleId !== "string" || moduleId.length === 0) {
        throw new Error(`Failed to resolve module id for slug ${mod.slug}`);
      }
      moduleIdsBySlug.set(mod.slug, moduleId);
    }

    for (const perm of SEED_PERMISSIONS) {
      await tx.execute(sql.raw(`
        INSERT INTO public.permissions (
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
          SELECT 1 FROM public.permissions
          WHERE slug = '${perm.slug}' AND NOT is_deleted
        )
      `));
    }

    let modulePermissionCount = 0;
    for (const perm of SEED_PERMISSIONS) {
      const mpId = perm.id;
      await tx.execute(sql.raw(`
        INSERT INTO public.module_permissions (
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
        FROM public.permissions p
        INNER JOIN public.modules m
          ON m.slug = '${perm.moduleSlug}' AND NOT m.is_deleted
        WHERE p.slug = '${perm.slug}' AND NOT p.is_deleted
          AND NOT EXISTS (
            SELECT 1 FROM public.module_permissions mp
            WHERE mp.module_id = m.id
              AND mp.permission_id = p.id
              AND NOT mp.is_deleted
          )
      `));
      modulePermissionCount += 1;
    }

    seedLog("master-data", "catalog seed committed", {
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
