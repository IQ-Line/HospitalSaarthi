import { sql } from "drizzle-orm";
import type { DbInstance } from "./connection.js";

function normalizePostgresUrl(connectionString: string): string {
  return connectionString.replace(/^postgresql\+psycopg:\/\//, "postgresql://");
}

/** Database name from a Postgres connection URL (`hims_dev`, etc.). */
export function parsePostgresDatabaseName(connectionString: string): string {
  const url = new URL(normalizePostgresUrl(connectionString));
  const name = decodeURIComponent(url.pathname.replace(/^\//, ""));
  if (!name) {
    throw new Error("Postgres URL is missing database name in path");
  }
  return name;
}

/** Shared operational DB URL (hims_dev locally). */
export function resolveDatabaseUrl(): string {
  const databaseUrl = process.env["DATABASE_URL"]?.trim();
  if (!databaseUrl || databaseUrl.length === 0) {
    throw new Error(
      "DATABASE_URL is required (e.g. postgresql://hims:hims@localhost:5433/hims_dev)",
    );
  }
  return databaseUrl;
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

export type AssertModuleSchemaInput = {
  db: DbInstance;
  connectionString: string;
  schemaName: string;
  migrateHint: string;
};

async function assertModuleSchema(input: AssertModuleSchemaInput): Promise<void> {
  const dbName = await currentDatabase(input.db);
  const expected = parsePostgresDatabaseName(input.connectionString);
  if (dbName !== expected) {
    throw new Error(
      `DATABASE_URL points at database "${expected}" but connected to "${dbName}".`,
    );
  }

  if (!(await schemaExists(input.db, input.schemaName))) {
    throw new Error(
      `Database "${dbName}" is missing schema "${input.schemaName}". ${input.migrateHint}`,
    );
  }
}

export type AssertUserManagementDatabaseInput = {
  db: DbInstance;
  connectionString: string;
};

/** User Management uses schema `user_management` on the shared operational database. */
export async function assertUserManagementDatabaseIsolation(
  input: AssertUserManagementDatabaseInput,
): Promise<void> {
  await assertModuleSchema({
    ...input,
    schemaName: "user_management",
    migrateHint: "Run: npx nx run user-management:db-migrate",
  });
}

export type AssertConfiguratorDatabaseInput = {
  db: DbInstance;
  connectionString: string;
};

/** Configurator uses schema `configurator` on the shared operational database. */
export async function assertConfiguratorDatabaseIsolation(
  input: AssertConfiguratorDatabaseInput,
): Promise<void> {
  await assertModuleSchema({
    ...input,
    schemaName: "configurator",
    migrateHint: "Run: npx nx run configurator:db-migrate",
  });
}
