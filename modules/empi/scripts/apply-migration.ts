import { resolveDatabaseUrl } from "@hims/ts-sdk-db";
import { applyEmpiSchemaMigration } from "../src/schema/apply-migration.js";

await applyEmpiSchemaMigration(resolveDatabaseUrl());
console.log("[empi] schema migration applied.");
