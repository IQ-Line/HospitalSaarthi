import { applyEmpiSchemaMigration } from "../src/schema/apply-migration.js";

const url = process.env["DATABASE_URL"]?.trim();
if (!url) {
  console.error("DATABASE_URL is required (e.g. from repo root .env)");
  process.exit(1);
}

await applyEmpiSchemaMigration(url);
console.log("EMPI schema migration applied.");
