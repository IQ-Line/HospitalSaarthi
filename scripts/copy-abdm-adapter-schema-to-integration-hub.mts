#!/usr/bin/env node
/**
 * Copy all ABDM tables from abdm_adapter → integration_hub (Phase 1a Step 4).
 *
 * Usage:
 *   pnpm copy-abdm-schema              # copy + verify row counts
 *   pnpm copy-abdm-schema -- --drop    # copy, verify, then DROP SCHEMA abdm_adapter CASCADE
 *
 * Requires DATABASE_URL (or INTEGRATION_HUB_DATABASE_URL / ABDM_DATA_DATABASE_URL).
 * Run `npx nx run integration-hub-svc:db-migrate` first so integration_hub exists.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const TABLES = [
  "abdm_sessions",
  "abdm_inbound_messages",
  "abdm_link_tokens",
  "abdm_consent_artefacts",
  "abdm_link_otps",
  "abdm_m3_consent_requests",
  "abdm_m3_consent_artefacts_hiu",
  "abdm_m3_data_transfers",
] as const;

function loadEnvFile(filePath: string, override: boolean): void {
  if (!existsSync(filePath)) return;
  for (const line of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (override || process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadEnvFile(path.join(repoRoot, ".env"), false);
loadEnvFile(path.join(repoRoot, "services/integration-hub-svc/.env"), true);

const dropSchema = process.argv.includes("--drop");

const { createDb, sql } = await import("../packages/ts-sdk-db/src/index.ts");

function resolveDatabaseUrl(): string {
  const raw = (
    process.env["INTEGRATION_HUB_DATABASE_URL"] ??
    process.env["ABDM_DATA_DATABASE_URL"] ??
    process.env["DATABASE_URL"] ??
    ""
  ).trim();
  if (!raw) {
    console.error(
      "Set DATABASE_URL, INTEGRATION_HUB_DATABASE_URL, or ABDM_DATA_DATABASE_URL",
    );
    process.exit(1);
  }
  return raw.replace(/^postgresql\+psycopg:\/\//i, "postgresql://");
}

async function schemaExists(db: ReturnType<typeof createDb>, name: string): Promise<boolean> {
  const rows = await db.execute<{ exists: boolean }>(sql`
    SELECT EXISTS(
      SELECT 1 FROM information_schema.schemata WHERE schema_name = ${name}
    ) AS exists
  `);
  return Boolean(rows.rows[0]?.exists);
}

async function tableCount(
  db: ReturnType<typeof createDb>,
  schema: string,
  table: string,
): Promise<number> {
  const q = `SELECT count(*)::int AS c FROM ${schema}.${table}`;
  const rows = await db.execute<{ c: number }>(sql.raw(q));
  return Number(rows.rows[0]?.c ?? 0);
}

const db = createDb(resolveDatabaseUrl());

const srcExists = await schemaExists(db, "abdm_adapter");
const dstExists = await schemaExists(db, "integration_hub");

if (!dstExists) {
  console.error("[copy-abdm-schema] integration_hub schema missing — run integration-hub-svc:db-migrate");
  process.exit(1);
}

if (!srcExists) {
  console.log("[copy-abdm-schema] abdm_adapter schema not found — nothing to copy (OK if fresh DB)");
} else {
  console.log("[copy-abdm-schema] copying abdm_adapter → integration_hub …");
  for (const table of TABLES) {
    const beforeSrc = await tableCount(db, "abdm_adapter", table);
    const insertSql = `
      INSERT INTO integration_hub.${table}
      SELECT * FROM abdm_adapter.${table}
      ON CONFLICT DO NOTHING
    `;
    await db.execute(sql.raw(insertSql));
    const afterSrc = await tableCount(db, "abdm_adapter", table);
    const afterDst = await tableCount(db, "integration_hub", table);
    console.log(
      `  ${table}: src=${afterSrc} dst=${afterDst}${beforeSrc !== afterSrc ? " (src changed during copy?)" : ""}`,
    );
    if (afterDst < afterSrc) {
      console.error(
        `[copy-abdm-schema] FAILED ${table}: integration_hub count (${afterDst}) < abdm_adapter (${afterSrc})`,
      );
      process.exit(1);
    }
  }
  console.log("[copy-abdm-schema] row-count verification passed (dst >= src for all tables)");
}

if (dropSchema) {
  if (srcExists) {
    await db.execute(sql.raw("DROP SCHEMA IF EXISTS abdm_adapter CASCADE"));
    console.log("[copy-abdm-schema] dropped schema abdm_adapter");
  } else {
    console.log("[copy-abdm-schema] --drop: abdm_adapter already absent");
  }
}

console.log("[copy-abdm-schema] done");
