import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveDatabaseUrl } from "@hims/ts-sdk-db";
import { applyUserManagementSchemaMigration } from "../src/schema/apply-migration.js";
import { loadWorkspaceEnv } from "./load-workspace-env.js";

const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
loadWorkspaceEnv(workspaceRoot);

const databaseUrl = resolveDatabaseUrl();

await applyUserManagementSchemaMigration(databaseUrl);
console.log("[user-management] schema migration applied.");
