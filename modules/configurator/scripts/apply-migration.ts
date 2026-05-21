import { applyConfiguratorSchemaMigration } from "../src/schema/apply-migration.js";
import { resolveDatabaseUrl } from "@hims/ts-sdk-db";

const url = resolveDatabaseUrl();

await applyConfiguratorSchemaMigration(url);
console.log("Configurator schema migration applied.");
