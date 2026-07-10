# Testing guide

How tests are laid out and run on the HIMS platform. Every command here has been run
against this branch. Practical over exhaustive — read once, then copy a neighbour.

> **Integrity is non-negotiable.** Never weaken an assertion, config, or expectation to
> get a green run. Tests must prove the *real* behaviour of the code under test — not a
> re-implementation of it in the test file. See the adversarial sweep in
> [`docs/architecture/cleanup/test-integrity-audit.md`](../architecture/cleanup/test-integrity-audit.md)
> for the exact failure modes we hunt (green tests that mirror the SUT, happy-path-only
> validators, `render()` with no assertion).

## 1. Layout

Tests live in a dedicated tree, **not** colocated next to source.

| Stack | Unit | Integration |
|---|---|---|
| TS module / service | `test/unit/**/*.test.ts` | `test/integration/**/*.integration.test.ts` |
| Python module (`master-data`, `opd`) | `tests/**` | `tests/integration/**` |

(`vitest.base.ts` still *collects* `src/**/*.test.ts` too, so a stray colocated test is
not silently dropped — but new tests go under `test/`.)

## 2. Unit tests (Vitest)

Every TS project has a two-line `vitest.config.ts` that spreads the shared base:

```ts
import { defineConfig } from "vitest/config";
import { baseTest } from "../../vitest.base";
export default defineConfig({ test: { ...baseTest } });
```

`vitest.base.ts` is the single source of truth for test collection. It guarantees:
- `include: ["src/**/*.test.ts", "test/**/*.test.ts"]` — both trees, so no project can
  silently drop a tree with its own narrower `include` (this bug bit three modules before
  the base existed). Object-spread **overrides** the array; it does not concatenate.
- `exclude` adds `**/*.sandbox.integration.test.ts` on top of Vitest's defaults, keeping
  the manual ABDM suites (§6) out of every automated run.

Run a whole project's unit suite:

```bash
npx nx run configurator:test          # → vitest run
```

Run a single file (from inside the module):

```bash
cd modules/configurator
npx vitest run test/unit/authz/configurator-authz-target-resolver.test.ts
```

Unit tests touch no database — mock the **port** (the repository interface), never Drizzle
itself. A use-case is a pure function; hand it a fake repo and assert on the effect.

## 3. Integration tests (real Postgres/Citus)

Integration suites run against a real Citus database — never SQLite. Each module gets its
own database, `hims_test_<module>`. The `test:integration` target hard-codes the scheme:

```jsonc
// modules/configurator/project.json
"test:integration": {
  "command": "TEST_DATABASE_URL=\"${TEST_DATABASE_BASE_URL:-postgresql://hims:hims@127.0.0.1:5432}/hims_test_configurator\" vitest run test/integration"
}
```

The local dev Citus container (`hims-postgres`) listens on **:5433**, not the :5432
default — override the base URL:

```bash
make infra    # start Citus + Cerbos if not already up
TEST_DATABASE_BASE_URL="postgresql://hims:hims@127.0.0.1:5433" \
  npx nx run configurator:test:integration
# → Test Files 3 passed (3), Tests 16 passed (16)
```

**Self-provisioning `beforeAll`.** A suite owns its own schema. `beforeAll` drops the
module schema (`DROP SCHEMA IF EXISTS configurator CASCADE`), re-applies the module's
migration, then connects — so the run is deterministic against any prior DB state.
`afterAll` drops it again. The database itself (`hims_test_<module>`) is created by CI's
per-module loop (or already exists locally).

**Skip cleanly DB-less.** The suite gates on the env var so a plain `nx run <m>:test` (or
CI without a DB) collects it but runs nothing — no hang, no false failure:

```ts
const TEST_DATABASE_URL = process.env["TEST_DATABASE_URL"];
const describeDb = TEST_DATABASE_URL ? describe : describe.skip;
```

For HTTP handlers, drive them with Fastify's in-process `app.inject()` — no port binding.

## 4. Python modules (pytest)

`master-data` and `opd` mirror the split. Unit tests mock the repo; integration tests hit
real Postgres.

```bash
npx nx run master-data:test           # → uv run pytest --ignore=tests/integration
```

Integration goes through `scripts/run-integration-tests.sh`, which does three things in
order: `alembic upgrade heads` → **`alembic check` (drift gate)** → `pytest tests/integration`.
The drift gate fails if the ORM models and the migration chain disagree on a
fully-migrated DB — the check that would have caught the missing inventory migration the
day it shipped. Override the URL for the local :5433 Citus:

```bash
cd modules/master-data
MASTER_DATA_TEST_DATABASE_URL="postgresql+psycopg://hims:hims@127.0.0.1:5433/hims_test_master_data" \
  bash scripts/run-integration-tests.sh
# → 79 passed
```

## 5. Cerbos policy tests

Policies live in `infra/cerbos/policies/<module>/`; their test corpus is
`infra/cerbos/tests/*_test.yaml`. Principals carry the **wire shape** the backend actually
sends — `roles: ["_unresolved"]` plus the derived attrs (`iq_tenant_id`, `capabilities`,
`clearances`, …) — so the tests exercise the real derived-role logic, not a shortcut. Every
resolver action must have both an **ALLOW** (capability present) and a **DENY** (capability
missing) expectation. Compile + run the whole corpus:

```bash
npx nx run cerbos-policies:compile   # cerbos image pinned in infra/cerbos/project.json
# → 279 tests executed [279 OK]
```

## 6. ABDM sandbox suites — manual only

The `*.sandbox.integration.test.ts` suites under
`modules/integration-hub/test/integration/integrations/abdm/` hit real infrastructure (and
some hit the live NHA sandbox). They are **not** CI coverage — triple-gated by the
`vitest.base.ts` exclude, a `RUN_ABDM_SANDBOX_TESTS=1` env flag, and live credentials. How
to run them, and what CI *does* cover instead, is documented in their
[README](../../modules/integration-hub/test/integration/integrations/abdm/use-cases/README.md).

## 7. Typecheck — one-shot `tsc`, never watch

Vitest (esbuild) and ESLint do **not** typecheck. Run a one-shot `tsc` before pushing;
it completes in seconds on the current WSL2 setup:

```bash
npx tsc -b modules/configurator      # or: npx tsc --noEmit
```

**Never run watch mode** (`tsc --watch`, `vitest` without `run`, any file-system watcher) —
persistent watchers are the WSL2 stall risk. One-shot commands only.
