import { resolveDatabaseUrl } from "@hims/ts-sdk-db";
import { applyRecordFoundationSchemaMigration } from "../src/schema/apply-migration.js";

await applyRecordFoundationSchemaMigration(resolveDatabaseUrl());
console.log("[record-foundation] schema migration applied.");
