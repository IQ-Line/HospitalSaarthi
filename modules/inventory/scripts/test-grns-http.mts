import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");
for (const line of readFileSync(join(root, ".env"), "utf8").split("\n")) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (!m) continue;
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

const tenantId =
  process.env["INVENTORY_DEV_TENANT_ID"] ?? "f47ac10b-58cc-4372-a567-0e02b2c3d480";
const url = "http://localhost:3008/api/inventory/v1/grns";

const response = await fetch(url, {
  headers: {
    iq_tenant_id: tenantId,
    "x-tenant-id": tenantId,
    Authorization: "Bearer dev",
  },
});

const body = await response.text();
console.log("status", response.status);
console.log(body);
