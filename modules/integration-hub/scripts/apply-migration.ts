import { applyIntegrationHubSchemaMigration } from "../src/schema/apply-migration.js";
import { resolveMigrationDatabaseUrl } from "./resolve-migration-database-url.js";

await applyIntegrationHubSchemaMigration(resolveMigrationDatabaseUrl());
console.log("[integration-hub] schema migration applied.");
