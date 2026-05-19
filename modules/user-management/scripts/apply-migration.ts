import { applyUserManagementSchemaMigration } from "../src/schema/apply-migration.js";

const url =
  process.env["USER_MGMT_DATABASE_URL"]?.trim() ||
  process.env["DATABASE_URL"]?.trim();

if (!url) {
  console.error(
    "USER_MGMT_DATABASE_URL or DATABASE_URL is required (e.g. from repo root .env)",
  );
  process.exit(1);
}

await applyUserManagementSchemaMigration(url);
console.log("User-management schema migration applied.");
