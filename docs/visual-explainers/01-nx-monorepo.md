---
title: Nx monorepo setup
objective: How the HIMS workspace is laid out, how project targets stay honest without plugin inference, and what the CI pipeline actually runs — grounded in the config on `dev--improved-v1`.
---

The repo is one **Nx 22 + pnpm** workspace of **51 projects** (`npx nx show projects`) across four layers. Config is centralized at the root; each project just declares which layer it belongs to via **tags**, and everything downstream — dependency rules, required targets, CI selection — keys off those tags.

```diagram title="Four layers and the one-way dependency rule" look=clean
flowchart TD
  subgraph apps["services/ — 14 deployable wrappers"]
    web["web (Vite app)"]
    bff["bff (token handler)"]
    svc["*-svc (Fastify shells)"]
  end
  subgraph mods["modules/ — 11 business modules"]
    tsmod["9 TypeScript"]
    pymod["2 Python: master-data, opd"]
  end
  subgraph pkgs["packages/ — SDKs + UI + config"]
    sdk["ts-sdk-* / py-sdk-*"]
    pulse["@pulse/* UI"]
    cfg["tsconfig, eslint-config"]
  end
  apps --> mods
  apps --> pkgs
  mods --> pkgs
  mods -. "FORBIDDEN: module → module" .-x mods
```

_Source: `eslint.config.js` → `packages/eslint-config/index.js` (`@nx/enforce-module-boundaries`), project `tags` in each `project.json`._

## Workspace layout

```filetree
. The-HIMS/
.   modules/ — 11 business modules; each owns schema, use-cases, handlers, events
.     billing/  configurator/  empi/  integration-hub/  inventory/
.     master-data/ — Python (uv/ruff/pytest)
.     opd/ — Python (uv/ruff/pytest)
.     pharmacy/  record-foundation/  registration/  user-management/
.   packages/ — SDKs & shared config (importable by anyone)
.     ts-sdk-*/ — db, events, http, identity, errors, tenant, fhir, abha, … (15)
.     py-sdk-*/ — abha, authz, fhir
.     pulse-*/ — vendored IQSandbox UI (blocks, ui, layouts, patterns, …)
.     tsconfig/ — shared tsconfig presets (@hims/tsconfig)
.     eslint-config/ — shared flat config (@hims/eslint-config)
.   services/ — 14 deployable units: web, bff, + 12 *-svc Fastify shells
.   specs/openapi/ — 11 <module>.v1.yaml contracts (spec-first)
.   infra/ — cerbos (policies), db, docker, k8s
.   tools/ — check-nx-target-conformance.mjs, codegen, seed scripts
.   nx.json  pnpm-workspace.yaml  tsconfig.base.json  vitest.base.ts
```

A **module** is a library of domain logic; a **service** is a thin Fastify (or Vite) shell that composes modules and gets deployed. `master-data` and `opd` are Python modules (their `project.json` carries `language:python` and drives `uv`/`ruff`/`pytest` instead of `tsc`/`vitest`).

## Targets are hand-authored — plugin inference was rejected

Every `project.json` spells out its own targets by hand. Nx **plugin inference** (auto-deriving targets from tool config) was evaluated and rejected: config here is already centralized at the root, so inference would infer nothing useful. The risk it was meant to prevent — target *drift* (a service with no `lint`, a phantom `test`, duplicate `migrate`) — is instead closed by a CI conformance guard.

```callout tone=decision title="D6 — hand-authored targets + a conformance guard, not inference"
`tools/check-nx-target-conformance.mjs` asserts every project exposes the canonical targets its **class** requires. It reads `npx nx show project` for all 51 projects and fails CI on any missing target, any unclassified project root, or any stale allowlist entry. A `--self-test` mode proves the checker actually catches a missing `lint`. This is the cheap alternative to inference, tuned to this repo's centralized layout.
```

| Project class | Required targets | Notes |
|---|---|---|
| `modules/*` (TS) | `lint`, `typecheck`, `test`, `test:integration` | domain logic carries the tests — no `build` |
| `modules/*` (Python) | `lint`, `test`, `test:integration` | no `typecheck` step |
| `services/*` (TS) | `lint`, `typecheck`, `build`, `serve` | thin shells |
| `services/*` (Python) | `lint`, `serve` | e.g. `abdm-adapter-svc` |
| `packages/*` (TS) | `lint`, `typecheck` | `test` only where real tests exist |
| `packages/*` (Python) | `lint`, `test` | |
| `infra/*` | _(none)_ | `cerbos-policies` checked by its own CI job |

_Source: `requiredTargets()` in `tools/check-nx-target-conformance.mjs`. The six `@pulse/*` packages plus three config-only packages are explicitly allowlisted (each with a one-line reason)._

## pnpm workspace: single-version catalog + a hard override

```code lang=yaml file=pnpm-workspace.yaml hl=3,10
catalog:
  vitest: ^4.1.6          # unified: was split across v3 and v4
  "@types/node": ^24.13.3
  drizzle-orm: ^0.45.2
  # … eslint, fastify, react, typescript, zod, @cerbos/*
overrides:
  "@types/node": ^24.13.3
```

Projects reference `catalog:` in their deps so the whole workspace resolves one version of each shared tool. `@types/node` gets an extra `overrides:` entry on top of the catalog:

```callout tone=warning title="Why @types/node needs overrides, not just catalog"
The `catalog:` protocol only applies to packages that opt in. Transitive deps can still drag in a different `@types/node` major, and multi-major hoisting made **typecheck results machine-dependent** (green on one laptop, red on another). `overrides:` forces every copy in the tree to `^24.13.3`, so `tsc` sees one lib surface everywhere.
```

## Shared test + tsconfig baselines

`vitest.base.ts` exports a `baseTest` object every project spreads into its own config. It pins the collection globs to **both** `src/**/*.test.ts` and `test/**/*.test.ts`:

```callout tone=warning title="vitest.base.ts exists because src tests were silently dropped"
A per-project `test/**`-only `include` silently skips colocated `src/**` unit tests — that bug hit three modules before this base existed. Object-spreading `baseTest` **overrides** the arrays (unlike `mergeConfig`, which concatenates), so every project collects both trees unless it deliberately narrows `include`. `*.sandbox.integration` files stay out.
```

TypeScript layers through `packages/tsconfig`: `tsconfig.base.json` (strict, `NodeNext`, `noUncheckedIndexedAccess`, project `paths` for every `@hims/*`) → presets `node-library.json` / `react-app.json` → each project's local `tsconfig.json`.

## CI pipeline

One `main` job on `ubuntu-latest`, gated on PRs and pushes to `dev`/`main`, with a **Citus 12.1** Postgres service container attached for the real-DB stages.

```diagram title="CI stages in order (.github/workflows/ci.yml)" look=clean
flowchart TD
  A["checkout (fetch-depth 0)"] --> B["setup: pnpm · node 24 · uv · nx-set-shas"]
  B --> C["pnpm install --frozen-lockfile"]
  C --> D["Nx target conformance guard"]
  D --> E["Lint · affected -t lint --parallel=3"]
  E --> F["Drizzle migration drift (tables.ts vs migrations)"]
  F --> G["Report-contract codegen drift · make check-report-contracts"]
  G --> H["Typecheck · affected --parallel=3"]
  H --> I["Validate specs · user-management-svc:validate-spec"]
  I --> J["Start Cerbos PDP (repo policies mounted)"]
  J --> K["Test · affected -t test --parallel=2"]
  K --> L["Cerbos compile + policy tests"]
  L --> M["Create per-module DBs (Citus)"]
  M --> N["Integration tests · affected -t test:integration --parallel=1"]
```

_Source: `.github/workflows/ci.yml`. Static analysis (conformance → lint → drift gates) runs before typecheck; real-DB integration runs last._

Three details are load-bearing:

- **Cerbos PDP is a real running sidecar, not a mock.** The PEP wiring suites (`empi-svc`, `configurator-svc`) call a live Cerbos at `:3593`. CI can't use a `services:` container (it starts before checkout, so it can't mount the repo's policies and would deny everything → 403). Instead a `docker run` step mounts `infra/cerbos/cerbos.yaml` + `infra/cerbos/policies` and waits on `/_cerbos/health`.
- **Integration tests run `--parallel=1` and each module `--no-file-parallelism`.** A per-module database (`hims_test_<module>`) isolates *data*, but the Citus **coordinator's** distributed-transaction bookkeeping and deadlock detector are cluster-wide. Concurrent `create_reference_table`/DDL across databases gets aborted with `40P01 "distributed deadlock"`, so serial is the only deterministic option.
- **Two drift gates + spec validation** run before tests: Drizzle (`tables.ts` must match committed migrations), report-contract codegen (`make check-report-contracts`), and OpenAPI spec ↔ runtime contract validation.

```callout tone=info title="Doc-vs-code notes (code wins)"
`docs/architecture/lld/repo-structure/01-monorepo-setup.md` is partly stale: its dependency table lists a `packages/openapi-clients` project that isn't present, and describes a "BFF → module services" service-to-service exception the ESLint config does **not** encode (`type:service` may depend on `type:module`/`sdk`/`client`, never `type:service`). `CLAUDE.md`'s "~38 modules" is EOI *scope*, not the 11 modules that exist today.
```

## Module-boundary rule

Modules cannot import other modules. This is enforced by tags, not convention — `@nx/enforce-module-boundaries` maps each `type:*` source tag to the tags it may depend on:

```code lang=js file=packages/eslint-config/index.js hl=3
{
  sourceTag: 'type:module',
  onlyDependOnLibsWithTags: ['type:sdk', 'type:client'],  // NOT type:module
}
```

Because `type:module` is absent from its own allow-list, any `modules/A → modules/B` import fails `nx affected -t lint`. Cross-module communication goes through events (async) or generated OpenAPI clients (sync) instead. Services (`type:service`) may depend on modules and SDKs but not on other services; apps (`type:app`, i.e. `web`) may depend on modules, SDKs, and `@pulse/*` UI.

## Command cheat-sheet

| Command | Does |
|---|---|
| `npx nx run web:serve` | Frontend dev server (Vite) |
| `npx nx run <module>-svc:serve` | Run one backend service |
| `npx nx affected -t test` | Test only what changed (vs `dev` base) |
| `npx nx affected -t lint` | Lint what changed (incl. boundary rule) |
| `npx nx affected -t typecheck` | One-shot `tsc --noEmit` per affected project |
| `npx nx graph` | Interactive dependency graph |
| `node tools/check-nx-target-conformance.mjs` | Run the target-conformance guard locally |
