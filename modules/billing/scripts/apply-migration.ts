import { resolveDatabaseUrl } from "@hims/ts-sdk-db";
import { applyBillingSchemaMigration } from "../src/schema/apply-migration.js";

await applyBillingSchemaMigration(resolveDatabaseUrl());
console.log("[billing] schema migration applied.");
