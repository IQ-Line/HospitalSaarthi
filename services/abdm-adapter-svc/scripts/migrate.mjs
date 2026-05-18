#!/usr/bin/env node
/**
 * Apply `abdm_adapter` schema using `DATABASE_URL` from `.env` in this directory.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

const serviceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
config({ path: path.join(serviceRoot, ".env") });

function resolveDatabaseUrl() {
  const raw = (
    process.env["DATABASE_URL"] ??
    process.env["ABDM_DATA_DATABASE_URL"] ??
    ""
  ).trim();
  if (!raw) return "";
  let urlString = raw.replace(/^postgresql\+psycopg:\/\//i, "postgresql://");
  try {
    const url = new URL(urlString);
    const host = url.hostname.toLowerCase();
    if (
      (host.endsWith(".postgres.database.azure.com") ||
        host.endsWith(".database.azure.com")) &&
      !url.searchParams.has("sslmode")
    ) {
      url.searchParams.set("sslmode", "require");
      urlString = url.toString();
    }
  } catch {
    /* keep urlString */
  }
  return urlString;
}

const url = resolveDatabaseUrl();
if (!url) {
  console.error("DATABASE_URL is missing in services/abdm-adapter-svc/.env");
  process.exit(1);
}

const migration = path.resolve(
  serviceRoot,
  "../../modules/abdm-adapter/migrations/0000_abdm_adapter_schema.sql",
);

console.log("Applying abdm_adapter migration…");
const result = spawnSync("psql", [url, "-f", migration], {
  stdio: "inherit",
  env: process.env,
});

process.exit(result.status ?? 1);
