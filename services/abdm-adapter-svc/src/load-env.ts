import { config } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveDatabaseUrl } from "./resolve-database-url.js";

const serviceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Load `services/abdm-adapter-svc/.env` before any other module reads `process.env`. */
config({ path: path.join(serviceRoot, ".env"), override: true });

export { serviceRoot };

/** Map informal `.env` keys to names the adapter expects (no-op if canonical keys set). */
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
    // Root monorepo `.env` often sets local `hims@localhost`; this service uses Azure `temp-abdm`.
    process.env["DATABASE_URL"] = adapterDb;
  }
}

/** `DATABASE_URL` from env (monorepo standard), with dialect/ssl normalisation. */
export function resolveDatabaseUrlFromEnv(): string {
  return resolveDatabaseUrl();
}
