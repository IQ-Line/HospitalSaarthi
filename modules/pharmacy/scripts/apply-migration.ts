import { resolveDatabaseUrl } from "@hims/ts-sdk-db";
import { applyPharmacySchemaMigration } from "../src/schema/apply-migration.js";

await applyPharmacySchemaMigration(resolveDatabaseUrl());
console.log("[pharmacy] schema migration applied.");
