import { applyRecordFoundationSchemaMigration } from "../src/schema/apply-migration.js";

applyRecordFoundationSchemaMigration().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
