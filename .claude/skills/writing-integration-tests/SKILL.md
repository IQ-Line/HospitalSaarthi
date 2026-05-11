---
name: writing-integration-tests
description: Use when writing or modifying integration tests for HIMS TypeScript modules — covers data-access repo tests against real PostgreSQL/Citus and HTTP handler tests via Fastify inject(). Enforces the rule that integration tests use real PostgreSQL, never SQLite or mocks at the DB layer.
---

# Writing Integration Tests — HIMS TypeScript Modules

## When this applies

- Testing a class in `modules/<name>/src/data-access/` against actual SQL behavior
- Testing a handler in `modules/<name>/src/rest-handlers/` end-to-end (Fastify → use-case → repo → DB)
- Verifying Drizzle queries, constraints, indexes, or other real-PostgreSQL behavior

If the test only needs to verify pure logic, use `writing-unit-tests` instead.

## File naming

- Integration test files: `<source-name>.integration.test.ts`, placed next to the source file
- Example: `data-access/organization.repo.ts` → `data-access/organization.repo.integration.test.ts`
- Vitest's unit-test config explicitly **excludes** `*.integration.test.ts`, and the integration config picks them up via a separate Nx target

## Prerequisites

A real PostgreSQL (Citus-compatible) instance must be reachable. Set `DATABASE_URL`:

- **Local dev:** start `infra/docker/docker-compose.yml` (`make infra`) — `DATABASE_URL=postgresql://hims:hims@localhost:5433/hims_dev`
- **CI:** GitHub Actions service container — `DATABASE_URL=postgresql://hims:hims@localhost:5432/hims_test`

If `DATABASE_URL` is unset, `createIntegrationDb` throws with a descriptive error.

## The pattern — data-access repo tests

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  createIntegrationDb,
  cleanupIntegrationDb,
  createTestOrganizationData,
  type IntegrationTestDb,
} from '@hims/ts-sdk-testing';
import { DrizzleOrganizationRepo } from './organization.repo.js';
import { CONFIGURATOR_TEST_SETUP_SQL } from '../schema/test-setup.sql.js';

let testDb: IntegrationTestDb;
let repo: DrizzleOrganizationRepo;

beforeAll(async () => {
  testDb = await createIntegrationDb('configurator', CONFIGURATOR_TEST_SETUP_SQL);
  repo = new DrizzleOrganizationRepo(testDb.db);
});

afterAll(async () => {
  if (testDb) await cleanupIntegrationDb(testDb);
});

describe('DrizzleOrganizationRepo', () => {
  it('creates and retrieves an organization', async () => {
    const created = await repo.create(createTestOrganizationData({ slug: 'apollo' }));
    const found = await repo.findById(created.id);
    expect(found).toBeDefined();
  });
});
```

Reference example: `modules/configurator/src/data-access/organization.repo.integration.test.ts`.

### What `createIntegrationDb` does

1. Reads `DATABASE_URL` (or `TEST_DATABASE_URL`)
2. Drops and recreates the schema (e.g. `configurator`) — `CASCADE` removes all tables
3. Runs the SQL string you pass to set up tables, indexes, and constraints
4. Returns `{ db, handle, schemaName }` where `db` is a Drizzle `NodePgDatabase`

Always pair it with `cleanupIntegrationDb(testDb)` in `afterAll`.

## The pattern — HTTP handler tests

Use Fastify's in-process `inject()` — no network port, no flakiness from ports in use.

```typescript
import Fastify, { type FastifyInstance } from 'fastify';
import { DrizzleOrganizationRepo } from '../data-access/organization.repo.js';
import { registerOrganizationsHandler } from './organizations.handler.js';
import {
  createIntegrationDb,
  cleanupIntegrationDb,
  type IntegrationTestDb,
} from '@hims/ts-sdk-testing';
import { CONFIGURATOR_TEST_SETUP_SQL } from '../schema/test-setup.sql.js';

let testDb: IntegrationTestDb;
let app: FastifyInstance;

beforeAll(async () => {
  testDb = await createIntegrationDb('configurator', CONFIGURATOR_TEST_SETUP_SQL);
  app = Fastify();
  registerOrganizationsHandler(app, new DrizzleOrganizationRepo(testDb.db));
  await app.ready();
});

afterAll(async () => {
  if (app) await app.close();
  if (testDb) await cleanupIntegrationDb(testDb);
});

it('GET /organizations returns 200', async () => {
  const response = await app.inject({ method: 'GET', url: '/organizations' });
  expect(response.statusCode).toBe(200);
});
```

Reference example: `modules/configurator/src/rest-handlers/organizations.handler.integration.test.ts`.

## Schema setup SQL — one file per module

Each module has a `src/schema/test-setup.sql.ts` exporting raw `CREATE TABLE` statements. The schema name in the SQL must match the `pgSchema("...")` name in `tables.ts` because Drizzle binds qualified table names at compile time.

When you add or change a table in `tables.ts`, mirror it in `test-setup.sql.ts`.

Reference: `modules/configurator/src/schema/test-setup.sql.ts`.

## Rules

1. **Use the module's real schema name** (`configurator`, `user_management`, `empi`, `master_data`) — Drizzle's `pgSchema(...)` binding requires this. `createTestDb` drops and recreates it for you.
2. **Always clean up in `afterAll`** — both `app.close()` and `cleanupIntegrationDb(testDb)`. Leaked connections accumulate and fail later tests.
3. **Single fork mode** — integration tests share the schema; the integration config already sets `pool: 'forks'` with `singleFork: true`.
4. **No SQLite, no mocks at the DB layer** — the point of integration tests is to verify real SQL behavior. If you find yourself reaching for SQLite or mocking Drizzle, write a unit test instead.
5. **30-second timeouts** — DB ops can be slow; the integration config sets `testTimeout: 30_000`.
6. **Generate unique data per test** — `createTestOrganizationData()` produces random slugs to avoid unique-constraint collisions between tests in the same suite.
7. **Import paths end in `.js`** — NodeNext module resolution.

## Running integration tests

```bash
# Start local Citus
make infra

# Run integration tests for one module
DATABASE_URL=postgresql://hims:hims@localhost:5433/hims_dev npx nx run configurator:test:integration

# Run integration tests for everything affected
DATABASE_URL=postgresql://hims:hims@localhost:5433/hims_dev npx nx affected -t test:integration
```

## What NOT to do

- Do not run `tsc` — see the global rule in `CLAUDE.md`.
- Do not mock the repo in an integration test — that defeats the purpose.
- Do not share state across files — each suite creates and tears down its own schema.
- Do not commit a hardcoded `DATABASE_URL` into a test file — read from env.
- Do not skip `afterAll` cleanup, even if "the next test will drop the schema anyway." Stale connections will bite you.
