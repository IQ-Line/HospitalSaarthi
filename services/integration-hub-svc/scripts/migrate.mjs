/**
 * Apply integration_hub SQL migrations (Phase 1a Part C).
 * Usage: pnpm --filter @hims/integration-hub-svc db:migrate
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

const serviceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(serviceRoot, "../..");
config({ path: path.join(repoRoot, ".env") });
config({ path: path.join(serviceRoot, ".env"), override: true });

function resolveDatabaseUrl() {
  const raw = (
    process.env["INTEGRATION_HUB_DATABASE_URL"] ??
    process.env["ABDM_DATA_DATABASE_URL"] ??
    process.env["DATABASE_URL"] ??
    ""
  ).trim();
  if (!raw) {
    console.error(
      "Set INTEGRATION_HUB_DATABASE_URL, ABDM_DATA_DATABASE_URL, or DATABASE_URL",
    );
    process.exit(1);
  }
  let urlString = raw.replace(/^postgresql\+psycopg:\/\//i, "postgresql://");
  try {
    const url = new URL(urlString);
    const host = url.hostname.toLowerCase();
    const isAzure =
      host.endsWith(".postgres.database.azure.com") ||
      host.endsWith(".database.azure.com");
    if (isAzure && !url.searchParams.has("sslmode")) {
      url.searchParams.set("sslmode", "require");
      urlString = url.toString();
    }
  } catch {
    /* keep urlString */
  }
  return urlString;
}

const migrations = [
  "0000_integration_hub_schema.sql",
  "0001_integration_hub_m2_schema.sql",
  "0002_abdm_link_otps.sql",
  "0003_integration_hub_m3_schema.sql",
  "0004_integration_hub_control_plane.sql",
].map((name) =>
  path.resolve(serviceRoot, "../../modules/integration-hub/migrations", name),
);

const urlString = resolveDatabaseUrl();

for (const migration of migrations) {
  console.log(`Applying ${path.basename(migration)}…`);
  const result = spawnSync("psql", [urlString, "-f", migration], {
    stdio: "inherit",
    env: process.env,
  });
  if ((result.status ?? 1) !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log("integration_hub migrations applied.");
process.exit(0);
