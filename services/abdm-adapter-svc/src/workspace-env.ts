import { config } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveDatabaseUrl } from "./resolve-database-url.js";

const serviceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const workspaceRoot = path.resolve(serviceRoot, "../..");

/** Repo-root env (same as `make setup` / other services). Optional `.env.local` overrides. */
for (const file of [
  path.join(workspaceRoot, ".env"),
  path.join(workspaceRoot, ".env.local"),
]) {
  config({ path: file, override: true });
}

export { serviceRoot, workspaceRoot };

/** Map informal Postman-style keys to canonical names. */
export function normalizeAbdmEnvAliases(): void {
  if (!process.env["ABDM_SANDBOX_CLIENT_ID"] && process.env["clientId"]) {
    process.env["ABDM_SANDBOX_CLIENT_ID"] = process.env["clientId"];
  }
  if (!process.env["ABDM_SANDBOX_CLIENT_SECRET"] && process.env["clientSecret"]) {
    process.env["ABDM_SANDBOX_CLIENT_SECRET"] = process.env["clientSecret"];
  }
}

export function resolveDatabaseUrlFromEnv(): string {
  return resolveDatabaseUrl();
}
