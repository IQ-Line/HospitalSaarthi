import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

export type DbInstance = NodePgDatabase;

/** Azure DB / RDS often require TLS; `pg` honors `sslmode` from the URL. */
export function normalizePostgresUrl(url: string): string {
  try {
    const normalized = url.replace(/^postgresql:/i, "postgres:");
    const u = new URL(normalized);
    const host = u.hostname || "";
    const needsSslHint =
      host.includes("database.azure.com") ||
      host.includes(".rds.amazonaws.com");
    if (needsSslHint && !u.searchParams.get("sslmode")) {
      u.searchParams.set("sslmode", "require");
    }
    return u.toString().replace(/^postgres:/, "postgresql:");
  } catch {
    return url;
  }
}

export function createDb(connectionString: string): DbInstance {
  const url = normalizePostgresUrl(connectionString);
  return drizzle({
    client: new Pool({ connectionString: url }),
  });
}
