import { resolveDatabaseUrl } from "@hims/ts-sdk-db";
import { applyUserManagementSchemaMigration } from "../src/schema/apply-migration.js";

await applyUserManagementSchemaMigration(resolveDatabaseUrl());
console.log("[user-management] schema migration applied.");
