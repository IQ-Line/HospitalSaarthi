import { applyRecordFoundationSchemaMigration } from "../src/schema/apply-migration.js";
import { resolveDatabaseUrl } from "@hims/ts-sdk-db";

const url = resolveDatabaseUrl();

await applyRecordFoundationSchemaMigration(url);
console.log("Record Foundation schema migration applied.");
