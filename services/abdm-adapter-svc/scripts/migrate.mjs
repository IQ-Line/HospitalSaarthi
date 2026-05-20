#!/usr/bin/env node
/**
 * Apply `abdm_adapter` schema.
 * Nx loads workspace-root `.env`; this script layers `services/abdm-adapter-svc/.env`.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

const serviceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
config({ path: path.join(serviceRoot, ".env"), override: true });

const url = (
  process.env["ABDM_DATA_DATABASE_URL"] ??
  process.env["DATABASE_URL"] ??
  ""
).trim();

if (!url) {
  console.error(
    "DATABASE_URL or ABDM_DATA_DATABASE_URL is required (set in root .env or services/abdm-adapter-svc/.env)",
  );
  process.exit(1);
}

let urlString = url.replace(/^postgresql\+psycopg:\/\//i, "postgresql://");
try {
  const parsed = new URL(urlString);
  const host = parsed.hostname.toLowerCase();
  if (
    (host.endsWith(".postgres.database.azure.com") ||
      host.endsWith(".database.azure.com")) &&
    !parsed.searchParams.has("sslmode")
  ) {
    parsed.searchParams.set("sslmode", "require");
    urlString = parsed.toString();
  }
} catch {
  /* keep urlString */
}

const migrations = [
  "0000_abdm_adapter_schema.sql",
  "0001_abdm_adapter_m2_schema.sql",
].map((name) =>
  path.resolve(serviceRoot, "../../modules/abdm-adapter/migrations", name),
);

for (const migration of migrations) {
  console.log(`Applying ${path.basename(migration)}…`);
  const result = spawnSync("psql", [urlString, "-f", migration], {
    stdio: "inherit",
    env: process.env,
  });
  if ((result.status ?? 1) !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log("abdm_adapter migrations applied.");
process.exit(0);
