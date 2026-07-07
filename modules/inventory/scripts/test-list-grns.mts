import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createDb } from "@hims/ts-sdk-db";
import { DrizzleInventoryGrnRepository } from "../src/data-access/grn.repo.js";
import { listGrns } from "../src/use-cases/list-grns.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const envPath = join(root, ".env");
for (const line of readFileSync(envPath, "utf8").split("\n")) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) {
    const key = m[1].trim();
    let value = m[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] ??= value;
  }
}

const db = createDb(process.env["DATABASE_URL"] ?? "");
const repo = new DrizzleInventoryGrnRepository(db);
const tenantId =
  process.env["INVENTORY_DEV_TENANT_ID"] ?? "f47ac10b-58cc-4372-a567-0e02b2c3d480";

try {
  const result = await listGrns({ grnRepo: repo }, tenantId, {});
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.error("ERROR:", error);
  process.exitCode = 1;
}
