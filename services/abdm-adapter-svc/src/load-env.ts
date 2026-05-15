import { config } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveAbdmDatabaseUrl } from "./resolve-database-url.js";

const serviceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Load `services/abdm-adapter-svc/.env` before any other module reads `process.env`. */
config({ path: path.join(serviceRoot, ".env") });

export { serviceRoot };

/** Map informal `.env` keys to names the adapter expects (no-op if canonical keys set). */
export function normalizeAbdmEnvAliases(): void {
  if (!process.env["ABDM_SANDBOX_CLIENT_ID"] && process.env["clientId"]) {
    process.env["ABDM_SANDBOX_CLIENT_ID"] = process.env["clientId"];
  }
  if (!process.env["ABDM_SANDBOX_CLIENT_SECRET"] && process.env["clientSecret"]) {
    process.env["ABDM_SANDBOX_CLIENT_SECRET"] = process.env["clientSecret"];
  }
}

/** `ABDM_DATA_DATABASE_URL` from `services/abdm-adapter-svc/.env` only. */
export function resolveAbdmDatabaseUrlFromEnv(): string {
  return resolveAbdmDatabaseUrl();
}
