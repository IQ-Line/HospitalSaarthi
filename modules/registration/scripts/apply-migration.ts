import { resolveDatabaseUrl } from "@hims/ts-sdk-db";
import { applyRegistrationSchemaMigration } from "../src/schema/apply-migration.js";

await applyRegistrationSchemaMigration(resolveDatabaseUrl());
console.log("[registration] schema migration applied.");
