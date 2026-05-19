import { config } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveDatabaseUrl } from "./resolve-database-url.js";

const serviceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// Nx already loaded root `.env` for `nx run abdm-adapter-svc:serve` (envFile in project.json).
// Layer service-local `.env` on top, matching the other TS services.
config({ path: path.join(serviceRoot, ".env"), override: true });

export { serviceRoot };

/** Map informal Postman-style keys and optional dedicated DB alias. */
export function normalizeAbdmEnvAliases(): void {
  if (!process.env["ABDM_SANDBOX_CLIENT_ID"] && process.env["clientId"]) {
    process.env["ABDM_SANDBOX_CLIENT_ID"] = process.env["clientId"];
  }
  if (!process.env["ABDM_SANDBOX_CLIENT_SECRET"] && process.env["clientSecret"]) {
    process.env["ABDM_SANDBOX_CLIENT_SECRET"] = process.env["clientSecret"];
  }
  if (!process.env["DATABASE_URL"]?.trim() && process.env["ABDM_DATA_DATABASE_URL"]?.trim()) {
    process.env["DATABASE_URL"] = process.env["ABDM_DATA_DATABASE_URL"];
  }
}

export function resolveDatabaseUrlFromEnv(): string {
  return resolveDatabaseUrl();
}
