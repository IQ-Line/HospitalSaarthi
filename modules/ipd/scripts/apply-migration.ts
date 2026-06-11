import { applyIpdSchemaMigration } from "../src/schema/migrate.js";

const url = process.env["DATABASE_URL"]?.trim();
if (!url) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

await applyIpdSchemaMigration(url);
console.log("IPD schema applied (0000 + 0001 + 0002 + 0003).");
