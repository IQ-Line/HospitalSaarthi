import { resolveDatabaseUrl } from "@hims/ts-sdk-db";
import { applyPlatformDataBootstrap } from "../src/dev/platform-data-bootstrap.js";

// nx loads the workspace-root .env into this task's env (NX_LOAD_DOT_ENV_FILES
// defaults true). Run via `nx run user-management:seed-platform`.
function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const databaseUrl = resolveDatabaseUrl();
const masterDataDatabaseUrl = requireEnv("MASTER_DATA_DATABASE_URL");

const secret = process.env.BETTER_AUTH_SECRET?.trim() ?? "";
const auth =
  secret.length >= 32
    ? {
        authBaseUrl: (process.env.AUTH_BASE_URL ?? "http://localhost:3000").replace(/\/+$/, ""),
        secret,
        jwtIssuer:
          process.env.JWT_ISSUER?.trim() || process.env.AUTH_BASE_URL || "http://localhost:3000",
        jwtAudience: process.env.JWT_AUDIENCE?.trim() || "hims-platform",
      }
    : undefined;

if (!auth) {
  console.warn(
    "[user-management] BETTER_AUTH_SECRET missing or short — super-admin platform user created without auth sign-up. Set BETTER_AUTH_SECRET (32+ chars) and re-run seed-platform.",
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
