# HIMS Platform — Claude Code Instructions

## What this is

Hospital Information Management System. Nx monorepo, TypeScript-first, polyglot-capable. Targets AIIMS EOI scope (~38 modules). Currently in Phase 0 (foundation).

## Architecture docs — read these first

- `docs/architecture/lld/repo-structure/01-monorepo-setup.md` — monorepo layout, module structure, layer rules, paradigm rules, CI pipeline
- `docs/architecture/lld/frontend/01-frontend-structure.md` — Zustand stores, TanStack Router, permissions, React Query patterns
- `docs/architecture/hld/03-module-shape-template.md` — contract every module follows
- `docs/architecture/analysis/03-database-principles.md` — schema rules, Citus distribution

## Stack

**Backend:** Fastify v5, Node.js 24 LTS, Drizzle ORM, PostgreSQL+Citus, Cerbos (authz), better-auth (authn)
**Frontend:** React 19, TanStack Router v1 (file-based routing), TanStack Query v5, Zustand, TanStack Table v8, TanStack Virtual v3, React Hook Form v7, Tailwind v4, @pulse/* (UI components)
**Tooling:** Nx 22, pnpm, Vitest, Playwright, k6, ESLint 10 (flat config), Prettier

## Critical rules

- **Typecheck with one-shot `tsc --noEmit` / `tsc -b`.** These are fine on the current WSL2 setup (the swap was increased ~2026-06-15; the old freeze is resolved) and complete in seconds — run them to catch type errors before pushing, since Vitest (esbuild) and ESLint do not typecheck. Still avoid long-lived **watch mode** (`tsc --watch`, watch-mode Vitest/Jest) — persistent file-system watchers remain the WSL2 stall risk, not one-shot builds.
- **Spec first.** Every module's API is defined in `specs/openapi/<module>.v1.yaml` before handler code.
- **No cross-module imports.** `modules/*` cannot import from other `modules/*`. Cross-module communication: events (async) or generated OpenAPI clients (sync).
- **Use-cases are functions, adapters are classes.** The layer determines the paradigm — see `01-monorepo-setup.md` §2.5.
- **Zustand selectors always.** `useStore(s => s.field)`, never bare `useStore()`.
- **`tenant_id` on every table.** Citus-distributed. See database principles.
- **Frontend auth is UX, not security.** `usePermissionsStore` is for UI gating. Backend Cerbos PDP is authoritative.
- **No cross-schema foreign keys.** Modules own separate schemas. Use events or API calls for cross-module data.
- **Rich event payloads.** Events carry all fields consumers might project — not just IDs.

## Module structure (every module follows this)

```
modules/<name>/src/
  ports.ts              → Repository interfaces
  domain/               → Types, value objects, entities with lifecycle
  use-cases/            → One function per file, deps injected as params
  data-access/          → Drizzle repos implementing ports (classes)
  http-handlers/        → Intent-based API handlers (functions)
  rest-handlers/        → RESTful CRUD endpoints (functions)
  events/publishers/    → Domain event emitters
  events/consumers/     → Handlers for events from other modules
  projections/          → Local read copies of other modules' data
  schema/               → Drizzle table definitions + migrations
  router.ts             → Mounts all handlers
  index.ts              → Public API
```

## Frontend structure

```
services/web/src/
  routes/               → TanStack Router file-based routes (auto-generates routeTree.gen.ts)
  features/<module>/    → Feature logic: api/ (query keys, queries, mutations), components/, store.ts
  stores/               → Global Zustand stores: auth, tenant, permissions, ui-prefs
  lib/                  → api-client, query-client, cerbos-client, permissions helpers
  styles/               → Tailwind + Pulse CSS variables
```

## Pulse UI packages

`packages/pulse-*` are copied from IQSandbox with react-router-dom replaced by @tanstack/react-router. These are UI components — do not trust their architectural patterns. Use the components, ignore how IQSandbox structures its app.

## Key ADRs

- ADR-0003: better-auth as identity adapter
- ADR-0004: Cerbos sidecar for authorization
- ADR-0013: Single database engine (PostgreSQL)
- ADR-0016: Polyglot Nx monorepo, spec-first contracts
- ADR-0017: InProcessEventBus for Phase 0
- ADR-0018: Frontend stack (Zustand, TanStack Router, TanStack Query)
- ADR-0019: Fastify v5, Node.js 24 LTS

## Nx commands

```bash
npx nx run web:serve              # Frontend dev server
npx nx run <module>-svc:serve     # One backend service
npx nx affected -t test           # Test what changed
npx nx affected -t lint           # Lint what changed
npx nx graph                      # Dependency graph
```
