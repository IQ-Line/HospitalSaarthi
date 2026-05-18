#!/usr/bin/env node
/**
 * Delete `abdm_adapter.abdm_sessions` rows past `context.expiresAt`.
 *
 * Schedule via cron / K8s CronJob in staging and production.
 */
import { spawnSync } from "node:child_process";
import { config } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const serviceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
config({ path: path.join(serviceRoot, ".env") });

function resolveDatabaseUrl() {
  const raw = (
    process.env["DATABASE_URL"] ??
    process.env["ABDM_DATA_DATABASE_URL"] ??
    ""
  ).trim();
  return raw.replace(/^postgresql\+psycopg:\/\//i, "postgresql://");
}

const url = resolveDatabaseUrl();
if (!url) {
  console.error("DATABASE_URL is missing in services/abdm-adapter-svc/.env");
  process.exit(1);
}

const sql = `
DELETE FROM abdm_adapter.abdm_sessions
WHERE (context->>'expiresAt') IS NOT NULL
  AND (context->>'expiresAt')::timestamptz < now();
`;

const result = spawnSync("psql", [url, "-c", sql], { stdio: "inherit" });
process.exit(result.status ?? 1);
