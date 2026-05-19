import { config } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveDatabaseUrl } from "./resolve-database-url.js";
import { resolveWorkspaceRoot } from "./resolve-workspace-root.js";

const serviceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const workspaceRoot = resolveWorkspaceRoot(serviceRoot);

/**
 * Env precedence (later wins):
 *   repo `.env` → repo `.env.local` → deprecated `services/abdm-adapter-svc/.env` → service `.env.local`
 */
for (const file of [
  path.join(workspaceRoot, ".env"),
  path.join(workspaceRoot, ".env.local"),
  path.join(serviceRoot, ".env"),
  path.join(serviceRoot, ".env.local"),
]) {
  config({ path: file, override: true });
}

export { serviceRoot, workspaceRoot };

/** Map informal Postman-style keys and legacy DB aliases. */
export function normalizeAbdmEnvAliases(): void {
  if (!process.env["ABDM_SANDBOX_CLIENT_ID"] && process.env["clientId"]) {
    process.env["ABDM_SANDBOX_CLIENT_ID"] = process.env["clientId"];
  }
  if (!process.env["ABDM_SANDBOX_CLIENT_SECRET"] && process.env["clientSecret"]) {
    process.env["ABDM_SANDBOX_CLIENT_SECRET"] = process.env["clientSecret"];
  }

  const adapterDb = process.env["ABDM_DATA_DATABASE_URL"]?.trim();
  const canonicalDb = process.env["DATABASE_URL"]?.trim();
  if (adapterDb && !canonicalDb) {
    process.env["DATABASE_URL"] = adapterDb;
  } else if (
    adapterDb &&
    canonicalDb &&
    (canonicalDb.includes("localhost") || canonicalDb.includes("127.0.0.1")) &&
    !adapterDb.includes("localhost") &&
    !adapterDb.includes("127.0.0.1")
  ) {
    // Deprecated split-DB: local monorepo DATABASE_URL + dedicated ABDM Postgres in service .env.
    // Prefer moving the ABDM URL to root `.env.local` as DATABASE_URL or ABDM_DATA_DATABASE_URL.
    process.env["DATABASE_URL"] = adapterDb;
  }
}

export function resolveDatabaseUrlFromEnv(): string {
  return resolveDatabaseUrl();
}
