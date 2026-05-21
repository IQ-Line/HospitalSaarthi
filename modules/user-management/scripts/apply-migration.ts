import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveDatabaseUrl } from "@hims/ts-sdk-db";
import { applyPlatformDataBootstrap } from "../src/dev/platform-data-bootstrap.js";
import { applyUserManagementSchemaMigration } from "../src/schema/apply-migration.js";
import { loadWorkspaceEnv, requireEnv } from "./load-workspace-env.js";

const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
loadWorkspaceEnv(workspaceRoot);

const databaseUrl = resolveDatabaseUrl();
const masterDataDatabaseUrl = requireEnv("MASTER_DATA_DATABASE_URL");

await applyUserManagementSchemaMigration(databaseUrl);
console.log("User-management schema migration applied.");

const secret = process.env.BETTER_AUTH_SECRET?.trim() ?? "";
const auth =
  secret.length >= 32
    ? {
        authBaseUrl: (process.env.AUTH_BASE_URL ?? "http://localhost:3000").replace(/\/+$/, ""),
        secret,
        jwtIssuer: process.env.JWT_ISSUER?.trim() || process.env.AUTH_BASE_URL || "http://localhost:3000",
        jwtAudience: process.env.JWT_AUDIENCE?.trim() || "hims-platform",
      }
    : undefined;

if (!auth) {
  console.warn(
    "[user-management] BETTER_AUTH_SECRET missing or short — super-admin platform user created without auth sign-up. Set BETTER_AUTH_SECRET (32+ chars) and re-run db-migrate.",
  );
}

const bootstrap = await applyPlatformDataBootstrap({
  databaseUrl,
  masterDataDatabaseUrl,
  auth,
});

console.log("[user-management] platform bootstrap:", bootstrap);
console.log(
  `[user-management] sign-in: ${process.env.DEVELOPMENT_BOOTSTRAP_USER_EMAIL ?? "platform@hospitalsaarthi.dev"} / password`,
);
