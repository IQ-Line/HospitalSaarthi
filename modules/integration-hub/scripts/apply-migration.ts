import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { applyIntegrationHubSchemaMigration } from "../src/schema/apply-migration.js";
import { loadWorkspaceEnv } from "./load-workspace-env.js";

const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
loadWorkspaceEnv(workspaceRoot);

function resolveDatabaseUrl(): string {
  const raw = (
    process.env["INTEGRATION_HUB_DATABASE_URL"] ??
    process.env["ABDM_DATA_DATABASE_URL"] ??
    process.env["DATABASE_URL"] ??
    ""
  ).trim();
  if (!raw) {
    throw new Error(
      "Set INTEGRATION_HUB_DATABASE_URL, ABDM_DATA_DATABASE_URL, or DATABASE_URL",
    );
  }
  return raw.replace(/^postgresql\+psycopg:\/\//i, "postgresql://");
}

await applyIntegrationHubSchemaMigration(resolveDatabaseUrl());
console.log("[integration-hub] schema migration applied.");
