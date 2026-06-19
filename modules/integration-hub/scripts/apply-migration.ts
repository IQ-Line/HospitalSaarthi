import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { applyIntegrationHubSchemaMigration } from "../src/schema/apply-migration.js";
import { loadMigrationEnv } from "./load-migration-env.js";
import { resolveMigrationDatabaseUrl } from "./resolve-migration-database-url.js";

const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
loadMigrationEnv(workspaceRoot);

const databaseUrl = resolveMigrationDatabaseUrl();

await applyIntegrationHubSchemaMigration(databaseUrl);
console.log("integration_hub migrations applied.");
