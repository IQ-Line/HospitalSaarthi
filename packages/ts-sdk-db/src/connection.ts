import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

export type DbInstance = NodePgDatabase;

export function createDb(connectionString: string): DbInstance {
  return drizzle({
    client: new Pool({ connectionString }),
  });
}
