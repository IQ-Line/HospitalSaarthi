import { applyConfiguratorSchemaMigration } from "../src/schema/apply-migration.js";

const url =
  process.env["CONFIGURATOR_DATABASE_URL"]?.trim() ||
  process.env["DATABASE_URL"]?.trim();

if (!url) {
  console.error(
    "CONFIGURATOR_DATABASE_URL is required (postgresql://…/hims-configurator). " +
      "Do not migrate Configurator into the shared hims_dev database.",
  );
  process.exit(1);
}

if (!url.includes("hims-configurator") && process.env["NODE_ENV"] !== "test") {
  console.warn(
    "[configurator:db-migrate] WARNING: CONFIGURATOR_DATABASE_URL does not reference hims-configurator.",
  );
}

await applyConfiguratorSchemaMigration(url);
console.log("Configurator schema migration applied.");
