/**
 * @deprecated Use `npx nx run integration-hub:db-migrate` (Node/pg via @hims/ts-sdk-db).
 * Kept so existing CI/docs invoking this path still work without psql.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const serviceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const script = path.resolve(
  serviceRoot,
  "../../modules/integration-hub/scripts/apply-migration.ts",
);

const result = spawnSync("pnpm", ["exec", "tsx", script], {
  stdio: "inherit",
  cwd: serviceRoot,
  env: process.env,
});

process.exit(result.status ?? 1);
