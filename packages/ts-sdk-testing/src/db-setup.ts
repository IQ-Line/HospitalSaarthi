import pg from 'pg';

const { Pool } = pg;

export interface TestDbHandle {
  readonly pool: pg.Pool;
  readonly schemaName: string;
}

export async function createTestDb(
  connectionString: string,
  schemaName: string,
): Promise<TestDbHandle> {
  const pool = new Pool({ connectionString });

  const safeName = sanitizeIdentifier(schemaName);
  // eslint-disable-next-line sonarjs/sql-queries -- trusted test-setup DDL, no untrusted input
  await pool.query(`DROP SCHEMA IF EXISTS ${safeName} CASCADE`);
  // eslint-disable-next-line sonarjs/sql-queries -- trusted test-setup DDL, no untrusted input
  await pool.query(`CREATE SCHEMA ${safeName}`);
  // eslint-disable-next-line sonarjs/sql-queries -- trusted test-setup DDL, no untrusted input
  await pool.query(`SET search_path TO ${safeName}`);

  return { pool, schemaName };
}

export async function cleanupTestDb(handle: TestDbHandle): Promise<void> {
  const safeName = sanitizeIdentifier(handle.schemaName);
  try {
    await handle.pool.query(`DROP SCHEMA IF EXISTS ${safeName} CASCADE`);
  } finally {
    await handle.pool.end();
  }
}

const IDENTIFIER_RE = /^[a-z_][a-z0-9_]*$/;

function sanitizeIdentifier(name: string): string {
  if (!IDENTIFIER_RE.test(name)) {
    throw new Error(
      `Invalid schema name "${name}". Must match ${IDENTIFIER_RE.source}`,
    );
  }
  return name;
}
