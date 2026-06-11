import { applyPharmacySchemaMigration } from "../src/schema/apply-migration.js";

const url = process.env["DATABASE_URL"]?.trim();
if (!url) {
  console.error("DATABASE_URL is required (e.g. from repo root .env)");
  process.exit(1);
}

await applyPharmacySchemaMigration(url);
console.log("Pharmacy schema migration applied.");
