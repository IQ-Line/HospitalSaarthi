---
title: Testing strategy & the integrity bar
objective: How HIMS tests are stratified — unit fakes, real-Citus integration, the Cerbos policy corpus, spec↔route validation — the CI wiring that keeps each honest, and the non-negotiable integrity culture around them.
---

Five layers, each with a different job and a different truth source. Nothing mocks what it is supposed to prove: unit fakes implement the **real port interface**, integration hits a **real Citus database**, and the authz corpus runs against the **real compiled policies**.

<!-- chapter: The five layers -->

```diagram title="Test taxonomy" look=clean
flowchart TB
  subgraph FAST["Fast / no external deps"]
    U["Unit — Vitest<br/>fakes typed vs real ports<br/>src+test globs"]
    SPEC["Spec validation<br/>OpenAPI to mounted routes<br/>bidirectional"]
  end
  subgraph REAL["Real infrastructure"]
    I["Integration — Vitest<br/>REAL Citus per module<br/>no SQLite, no DB mocks"]
    PY["Python — pytest<br/>real PG, alembic drift gate"]
    CB["Cerbos corpus<br/>281 YAML cases<br/>ALLOW and DENY each"]
  end
  MANUAL["Sandbox suites<br/>ABDM live NHA<br/>documented, NOT in CI"]
  U --> I
  SPEC --> CB
  style MANUAL stroke-dasharray: 5 5
```

| Layer | Runner | Truth source | Location |
|---|---|---|---|
| **Unit** | Vitest | Fakes typed against the module's `ports.ts` — no `as any` / `as never` masking | `test/unit/**` (+ stray `src/**/*.test.ts`) |
| **Integration** | Vitest | **Real Citus PostgreSQL**, one DB per module, self-provisioning schema | `test/integration/**/*.integration.test.ts` |
| **Python** | pytest | Real PG; `alembic check` drift gate before the suite | `modules/{master-data,opd}/tests/**` |
| **Cerbos corpus** | `cerbos compile --tests` | The actual compiled policies | `infra/cerbos/tests/*_test.yaml` |
| **Spec validation** | `tsx` script | Fastify route table vs OpenAPI doc | `services/user-management-svc/scripts/` |
| **Sandbox / manual** | Vitest (gated) | Live NHA ABDM sandbox — **not** CI coverage | `*.sandbox.integration.test.ts` |

<!-- chapter: Conventions with teeth -->

Each convention below is enforced by config, not by etiquette.

```code lang=ts file=vitest.base.ts
// Single source of truth for test collection. Object-spread OVERRIDES the array
// (unlike mergeConfig, which concatenates) — so no project can silently drop a tree.
export const baseTest = {
  environment: "node" as const,
  include: ["src/**/*.test.ts", "test/**/*.test.ts"],   // both trees, always
  exclude: [...configDefaults.exclude, "**/*.sandbox.integration.test.ts"],
};
```

- **Shared base, no silent drops.** Every `vitest.config.ts` is two lines spreading `baseTest`. A `test/**`-only `include` once dropped colocated `src` tests in three modules — the base makes that impossible.
- **Tests must typecheck.** Each module `tsconfig.json` `include` covers `test/**/*.ts` (e.g. `modules/configurator/tsconfig.json`), so a one-shot `tsc -b` type-checks the tests too. Adopted repo-wide this week. Vitest (esbuild) and ESLint do **not** typecheck.
- **Integration serialization** — two independent races, two flags (see `.github/workflows/ci.yml`):

```code lang=yaml file=.github/workflows/ci.yml hl=3,7
# Stage 5 — the whole integration STAGE runs one project at a time:
- name: Integration tests
  run: npx nx affected -t test:integration --parallel=1
# ...because the Citus coordinator's deadlock detector is CLUSTER-WIDE — concurrent
# DDL across per-module DBs aborts with 40P01 "distributed deadlock".
# And WITHIN a module, files run one at a time (schema-drop races):
#   test:integration → "vitest run --no-file-parallelism test/integration"
```

<!-- chapter: How to run it -->

Every command below exists today (verified against `project.json` / `Makefile` / `docs/guides/testing-guide.md`).

| Goal | Command |
|---|---|
| Test what changed | `npx nx affected -t test` |
| One module's unit suite | `npx nx run configurator:test` |
| Start Citus + Cerbos (local, port **:5433**) | `make infra` |
| One module's integration suite | `TEST_DATABASE_BASE_URL="postgresql://hims:hims@127.0.0.1:5433" npx nx run configurator:test:integration` |
| Python integration (drift gate + pytest) | `bash modules/master-data/scripts/run-integration-tests.sh` |
| Cerbos policy corpus | `docker run --rm -v "$(pwd)/infra/cerbos:/work" ghcr.io/cerbos/cerbos:0.53.0 compile --tests=/work/tests /work/policies` |
| Spec ↔ route coherence | `npx nx run user-management-svc:validate-spec` |
| Typecheck (one-shot, never `--watch`) | `npx tsc -b modules/configurator` |

```callout tone=info title="Integration suites self-provision"
Each suite's `beforeAll` runs `DROP SCHEMA IF EXISTS <module> CASCADE`, re-applies the migration, connects; `afterAll` drops it. The per-module database (`hims_test_<module>`) is created by CI's loop or already exists locally. Without `TEST_DATABASE_URL` the suite `describe.skip`s — no hang, no false pass.
```

<!-- chapter: ts-sdk-testing helpers -->

`packages/ts-sdk-testing/src` — the shared kit. Note the design: fakes are *typed against real interfaces*, and the DB helper creates **real** schemas, never a mock.

```filetree
. packages/ts-sdk-testing/src/
. index.ts — barrel export
. mock-event-bus.ts — MockEventBus: in-memory pub/sub, record published events
. mock-cerbos.ts — MockCerbos.allowAll / denyAll / withPolicy; records decisions
. principal-factory.ts — createTestPrincipal (wire-shape principal)
. tenant-fixtures.ts — TEST_TENANT_ID / TEST_ORG_ID / createTestTenant
. db-setup.ts — createTestDb / cleanupTestDb: REAL pg.Pool, DROP+CREATE SCHEMA
```

<!-- chapter: The integrity bar -->

The house culture — grounded in real suites in this repo.

```callout tone=risk title="Never weaken a test to make it pass"
An assertion, config, or expectation is never softened for a green run. Tests prove the *real* behaviour of the code under test — not a re-implementation of it in the test file. The failure modes we hunt (green tests that mirror the SUT, happy-path-only validators, `render()` with no assertion) are catalogued in `docs/architecture/cleanup/test-integrity-audit.md`.
```

```callout tone=decision title="Fail-closed completeness — the mechanism, not a comment"
`modules/user-management/test/unit/authz-mapping.test.ts` proves the app **refuses to boot** if any `authMode: "protected"` route lacks a resolver mapping — `app.ready()` rejects with `"AuthZ mapping incomplete: GET /unmapped-protected-route"`. A new unmapped route can't ship silently. The spec validator (`validate-user-management-openapi.mts`) is the same shape: it fails if a spec op has no route **or** a route is missing from the spec.
```

```callout tone=warning title="Adversarial review = mutation probes"
To trust a test: change the code it covers and confirm the test **fails**. The Cerbos corpus builds this in — every resolver action carries **both** an ALLOW (capability present) and a DENY (capability absent) case, so `281 tests executed [281 OK]` can't be satisfied by an over-permissive policy, and dead-string `super-admin` principals are pinned DENIED so a re-introduced role-selector rule fails the build. Fakes assert on real effects; integration tests assert on real DB rows.
```
