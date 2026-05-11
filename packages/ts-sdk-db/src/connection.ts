import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

export type DbInstance = NodePgDatabase;

function shouldUseSsl(connectionString: string): boolean {
  // Prefer explicit env flag (works even if DATABASE_URL has no query params)
  if ((process.env["PGSSLMODE"] ?? "").toLowerCase() === "require") return true;

  // Also support sslmode=require in DATABASE_URL for portability.
  try {
    const url = new URL(connectionString);
    return (url.searchParams.get("sslmode") ?? "").toLowerCase() === "require";
  } catch {
    return false;
  }
}

export function createDb(connectionString: string): DbInstance {
  const ssl = shouldUseSsl(connectionString)
    ? {
        // Common for managed Postgres (Azure/GCP) in dev: TLS required.
        // Use proper CA verification in production environments.
        rejectUnauthorized: false,
      }
    : undefined;

  return drizzle({
    client: new Pool({ connectionString, ssl }),
  });
}
