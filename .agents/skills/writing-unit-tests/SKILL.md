---
name: writing-unit-tests
description: Use when writing or modifying unit tests for HIMS TypeScript modules — covers use-case, domain, and pure-function tests. Enforces the rule that unit tests never touch a database (no SQLite, no PostgreSQL) and mock port interfaces instead.
---

# Writing Unit Tests — HIMS TypeScript Modules

## When this applies

- Adding tests for a file in `modules/<name>/src/use-cases/`
- Adding tests for a file in `modules/<name>/src/domain/`
- Testing any pure function or class that does not need a real database

If the test needs a database, use the `writing-integration-tests` skill instead.

## File naming

- Unit test files: `<source-name>.test.ts`, placed next to the source file
- Example: `use-cases/list-organizations.ts` → `use-cases/list-organizations.test.ts`
- Never name a unit test `*.integration.test.ts` — that suffix is reserved

## The pattern — use-case tests

Use-cases are functions that accept port interfaces (`OrganizationRepo`, `TenantRepo`, etc.) as parameters. To test them, build a mock that satisfies the port and inject it.

```typescript
import { describe, it, expect, vi } from 'vitest';
import { listOrganizations } from './list-organizations.js';
import type { OrganizationRepo } from '../ports.js';
import type { Organization } from '../domain/organization.types.js';

function createMockRepo(orgs: Organization[]): OrganizationRepo {
  return {
    findAll: vi.fn().mockResolvedValue(orgs),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  };
}

describe('listOrganizations', () => {
  it('delegates to repo.findAll', async () => {
    const repo = createMockRepo([]);
    await listOrganizations(repo);
    expect(repo.findAll).toHaveBeenCalledWith(undefined);
  });
});
```

Reference example: `modules/configurator/src/use-cases/list-organizations.test.ts`.

## The pattern — domain / pure-function tests

Domain types, value objects, and helpers have no external dependencies. Test them directly with no mocks.

```typescript
import { describe, it, expect } from 'vitest';
import { someDomainFunction } from './some-domain-file.js';

describe('someDomainFunction', () => {
  it('returns expected value for valid input', () => {
    expect(someDomainFunction('input')).toBe('expected');
  });
});
```

## Fixtures available from `@hims/ts-sdk-testing`

```typescript
import {
  // Mocks
  MockEventBus,
  MockCerbos,

  // Principal / tenant fixtures
  createTestPrincipal,
  createTestTenant,
  TEST_TENANT_ID,
  TEST_ORG_ID,

  // Entity data factories (for building create-payloads)
  createTestOrganizationData,
  createTestTenantSeedData,
} from '@hims/ts-sdk-testing';
```

### MockEventBus
```typescript
const bus = new MockEventBus();
// run the code under test
expect(bus.getPublishedEvents()).toHaveLength(1);
expect(bus.getEventsByType('patient.registered')).toHaveLength(1);
bus.reset();
```

### MockCerbos
```typescript
const cerbos = MockCerbos.allowAll();
const cerbos = MockCerbos.denyAll();
const cerbos = MockCerbos.withPolicy([
  { resource: 'patient', action: 'read', effect: 'EFFECT_ALLOW' },
]);
```

## Rules

1. **Import from `vitest` explicitly** — `import { describe, it, expect, vi } from 'vitest';`. Do not enable globals.
2. **Mock ONLY at the port boundary** — never mock Drizzle, Fastify, `node:crypto`, etc. If you find yourself doing that, the test belongs as an integration test.
3. **Use `vi.fn()`** for mock methods, not hand-rolled stub objects with `jest.fn()`-style shims.
4. **No database in unit tests** — no SQLite, no in-memory PG, no testcontainers. If you need a real DB, write a `.integration.test.ts` instead.
5. **No HTTP in unit tests** — do not start a Fastify instance. Call the use-case function directly.
6. **Import paths end in `.js`** — this monorepo uses NodeNext module resolution.
7. **One unit test file per source file** — same directory, same base name plus `.test.ts`.
8. **No cross-module imports** — a configurator unit test cannot import from `modules/empi/...`.

## Running unit tests

```bash
# Run unit tests for one module
npx nx run configurator:test

# Run unit tests for everything affected
npx nx affected -t test

# Run a single file (from the module directory)
cd modules/configurator && npx vitest run src/use-cases/list-organizations.test.ts
```

## What NOT to do

- Do not run `tsc`, `tsc --noEmit`, or `tsc -b` — they freeze on WSL2 (`CLAUDE.md` rule). Vitest handles TypeScript natively.
- Do not create a `__tests__/` directory — tests sit next to the source file.
- Do not put HTTP/DB setup helpers in unit-test files — they belong in integration tests.
- Do not use real `setTimeout`/`setInterval` without `vi.useFakeTimers()` — flaky tests follow.
