#!/usr/bin/env node
/**
 * Delete `abdm_adapter.abdm_sessions` rows past `context.expiresAt`.
 *
 * Schedule via cron / K8s CronJob in staging and production.
 */
import { spawnSync } from "node:child_process";
import { loadWorkspaceEnv } from "./load-workspace-env.mjs";

loadWorkspaceEnv();

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
  console.error(
    "DATABASE_URL is missing (set in repo root .env or deprecated ABDM_DATA_DATABASE_URL)",
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
