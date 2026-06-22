import { resolveDatabaseUrl } from "@hims/ts-sdk-db";
import { applyConfiguratorSchemaMigration } from "../src/schema/apply-migration.js";

await applyConfiguratorSchemaMigration(resolveDatabaseUrl());
console.log("[configurator] schema migration applied.");
