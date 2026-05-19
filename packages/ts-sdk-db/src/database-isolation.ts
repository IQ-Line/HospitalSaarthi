import { sql } from "drizzle-orm";
import type { DbInstance } from "./connection.js";

function normalizePostgresUrl(connectionString: string): string {
  return connectionString.replace(/^postgresql\+psycopg:\/\//, "postgresql://");
}

/** Database name from a Postgres connection URL (`hims-user-management`, etc.). */
export function parsePostgresDatabaseName(connectionString: string): string {
  const url = new URL(normalizePostgresUrl(connectionString));
  const name = decodeURIComponent(url.pathname.replace(/^\//, ""));
  if (!name) {
    throw new Error("Postgres URL is missing database name in path");
  }
  return name;
}

async function schemaExists(db: DbInstance, schemaName: string): Promise<boolean> {
  const result = await db.execute(
    sql`SELECT EXISTS (
      SELECT 1 FROM information_schema.schemata WHERE schema_name = ${schemaName}
    ) AS exists`,
  );
  const rows = readRows(result);
  const value = rows[0]?.exists;
  return value === true || value === "t" || value === 1;
}

function readRows(result: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(result)) {
    return result as Array<Record<string, unknown>>;
  }
  if (result && typeof result === "object" && "rows" in result) {
    return (result as { rows: Array<Record<string, unknown>> }).rows;
  }
  return [];
}

async function currentDatabase(db: DbInstance): Promise<string> {
  const result = await db.execute(sql`SELECT current_database() AS name`);
  const rows = readRows(result);
  const name = rows[0]?.name;
  if (typeof name !== "string" || name.length === 0) {
    throw new Error("Could not read current_database()");
  }
  return name;
}

export type AssertUserManagementDatabaseInput = {
  db: DbInstance;
  connectionString: string;
};

/**
 * User Management must use `hims-user-management` only — never a DB that also hosts `configurator.*`.
 */
export async function assertUserManagementDatabaseIsolation(
  input: AssertUserManagementDatabaseInput,
): Promise<void> {
  const dbName = await currentDatabase(input.db);
  const expected = parsePostgresDatabaseName(input.connectionString);
  if (dbName !== expected) {
    throw new Error(
      `USER_MGMT_DATABASE_URL points at database "${expected}" but connected to "${dbName}".`,
    );
  }

  if (await schemaExists(input.db, "configurator")) {
    throw new Error(
      `Database "${dbName}" contains schema "configurator". ` +
        "Configurator data belongs in hims-configurator (configurator-svc). " +
        "Run: npx nx run user-management:db-migrate",
    );
  }
}

export type AssertConfiguratorDatabaseInput = {
  db: DbInstance;
  connectionString: string;
};

/**
 * Configurator service must use `hims-configurator` with `configurator` schema — not user-management DB.
 */
export async function assertConfiguratorDatabaseIsolation(
  input: AssertConfiguratorDatabaseInput,
): Promise<void> {
  const dbName = await currentDatabase(input.db);
  const expected = parsePostgresDatabaseName(input.connectionString);
  if (dbName !== expected) {
    throw new Error(
      `CONFIGURATOR_DATABASE_URL points at database "${expected}" but connected to "${dbName}".`,
    );
  }

  if (!(await schemaExists(input.db, "configurator"))) {
    throw new Error(
      `Database "${dbName}" is missing schema "configurator". ` +
        "Run: npx nx run configurator:db-migrate",
    );
  }

  if (await schemaExists(input.db, "user_management")) {
    throw new Error(
      `Database "${dbName}" also contains schema "user_management". ` +
        "Use a dedicated hims-configurator database — do not share hims-user-management.",
    );
  }
}
