import { applyUserManagementSchemaMigration } from "../src/schema/apply-migration.js";
import { resolveDatabaseUrl } from "@hims/ts-sdk-db";

const url = resolveDatabaseUrl();

await applyUserManagementSchemaMigration(url);
console.log("User-management schema migration applied.");
