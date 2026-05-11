import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { createTestDb, cleanupTestDb, type TestDbHandle } from './db-setup.js';

export interface IntegrationTestDb {
  readonly db: NodePgDatabase;
  readonly handle: TestDbHandle;
  readonly schemaName: string;
}

export async function createIntegrationDb(
  schemaName: string,
  setupSql: string,
): Promise<IntegrationTestDb> {
  const connectionString = getTestDatabaseUrl();
  const handle = await createTestDb(connectionString, schemaName);
  const db = drizzle({ client: handle.pool });

  if (setupSql.trim().length > 0) {
    await handle.pool.query(setupSql);
  }

  return { db, handle, schemaName };
}

export async function cleanupIntegrationDb(testDb: IntegrationTestDb): Promise<void> {
  await cleanupTestDb(testDb.handle);
}

export function getTestDatabaseUrl(): string {
  const url = process.env['DATABASE_URL'] ?? process.env['TEST_DATABASE_URL'];
  if (!url) {
    throw new Error(
      'Integration tests require DATABASE_URL (or TEST_DATABASE_URL). ' +
        'Local: postgresql://hims:hims@localhost:5433/hims_dev (via `make infra`). ' +
        'CI: postgresql://hims:hims@localhost:5432/hims_test.',
    );
  }
  return url;
}

export function uniqueSchemaName(prefix: string): string {
  const suffix = Math.random().toString(36).slice(2, 8);
  return `test_${prefix}_${suffix}`;
}
