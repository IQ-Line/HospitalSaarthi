import { applyInventorySchemaMigration } from "../src/schema/apply-migration.js";

const url = process.env["DATABASE_URL"]?.trim();
if (!url) {
  console.error("DATABASE_URL is required (e.g. from repo root .env)");
  process.exit(1);
}

await applyInventorySchemaMigration(url);
console.log("Inventory schema migration applied.");
