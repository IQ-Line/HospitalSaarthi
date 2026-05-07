/**
 * Programmatic Drizzle migrate — prints full postgres/drizzle errors (drizzle-kit TUI can hide them).
 */
import { config as loadEnv } from "dotenv";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: resolve(__dirname, "../../../.env"), quiet: true });

let url = process.env.DATABASE_URL?.trim();
if (!url) {
  console.error(
    "Migration failed: DATABASE_URL is empty or missing. Set it in .env at the repo root.",
  );
  process.exit(1);
}

/** Same rules as @hims/ts-sdk-db normalizePostgresUrl (plain JS for node ./scripts without build). */
function normalizePostgresUrl(connectionString) {
  try {
    const normalized = connectionString.replace(/^postgresql:/i, "postgres:");
    const u = new URL(normalized);
    const host = u.hostname || "";
    const needsSslHint =
      host.includes("database.azure.com") ||
      host.includes(".rds.amazonaws.com");
    if (needsSslHint && !u.searchParams.get("sslmode")) {
      u.searchParams.set("sslmode", "require");
      console.error(
        'Added sslmode=require for managed Postgres host (Azure/RDS require TLS). Override by setting sslmode in DATABASE_URL.',
      );
    }
    return u.toString().replace(/^postgres:/, "postgresql:");
  } catch {
    return connectionString;
  }
}

url = normalizePostgresUrl(url);

/** Prints host/user/db so you can confirm .env matches what you use in DBeaver (password never shown). */
function summarizeConnectionTarget(connectionString) {
  try {
    const normalized = connectionString.replace(/^postgresql:/i, "postgres:");
    const u = new URL(normalized);
    const database = u.pathname.replace(/^\//, "").split("/")[0] || "";
    return {
      user: decodeURIComponent(u.username || "(none)"),
      host: u.hostname || "(none)",
      port: u.port || "5432",
      database: database || "(none)",
    };
  } catch {
    return null;
  }
}

const target = summarizeConnectionTarget(url);
if (target) {
  console.error(
    `Connecting (TCP, same as psql -h): user="${target.user}" host="${target.host}" port=${target.port} database="${target.database}"`,
  );
}

const migrationsFolder = resolve(__dirname, "../migrations");
const pool = new pg.Pool({ connectionString: url }); // url includes sslmode=require on Azure when needed
const db = drizzle(pool);

try {
  await migrate(db, { migrationsFolder });
  console.log("Migrations applied successfully.");
} catch (err) {
  console.error("Migration failed:");
  console.error(err);
  const cause = err?.cause;
  if (cause && typeof cause === "object" && "code" in cause && cause.code === "28P01") {
    console.error(`
PostgreSQL rejected this login over TCP (localhost + password). Node and DBeaver both use this path when host is set.

Checklist:
  1) Same server on port 5432? Run: ss -tlnp | grep 5432
  2) Test login exactly like Node does:
       PGPASSWORD='hims' psql -h 127.0.0.1 -p 5432 -U hims -d hims_dev -c 'select 1'
     If this fails, Postgres still does not accept user hims with that password — fix in psql as postgres:
       sudo -u postgres psql -c "ALTER USER hims WITH PASSWORD 'hims';"
     Or create the role + DB:
       sudo -u postgres psql -c "CREATE USER hims WITH PASSWORD 'hims';"
       sudo -u postgres psql -c "CREATE DATABASE hims_dev OWNER hims;"
  3) If DBeaver uses user "postgres" but .env uses "hims", either align them or match DATABASE_URL to DBeaver.
`);
  }
  process.exit(1);
} finally {
  await pool.end();
}
