#!/usr/bin/env node
/**
 * Delete `abdm_adapter.abdm_sessions` rows past `context.expiresAt`.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

const serviceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
config({ path: path.join(serviceRoot, ".env"), override: true });

const raw = (
  process.env["ABDM_DATA_DATABASE_URL"] ??
  process.env["DATABASE_URL"] ??
  ""
).trim();
const url = raw.replace(/^postgresql\+psycopg:\/\//i, "postgresql://");

if (!url) {
  console.error(
    "DATABASE_URL or ABDM_DATA_DATABASE_URL is required (set in root .env or services/integration-hub-svc/.env)",
  );
  process.exit(1);
}

const sql = `
DELETE FROM abdm_adapter.abdm_sessions
WHERE (context->>'expiresAt') IS NOT NULL
  AND (context->>'expiresAt')::timestamptz < now();
`;

const result = spawnSync("psql", [url, "-c", sql], { stdio: "inherit" });
process.exit(result.status ?? 1);
