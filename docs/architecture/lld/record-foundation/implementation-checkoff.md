# Record Foundation — Implementation Checkoff

## Phase A — Scaffold + Schema

### A1 — Module Scaffold
- [ ] `modules/record-foundation/project.json`
- [ ] `modules/record-foundation/package.json`
- [ ] `modules/record-foundation/tsconfig.json`
- [ ] `modules/record-foundation/vitest.config.ts`
- [ ] `modules/record-foundation/drizzle.config.ts`
- [ ] `modules/record-foundation/scripts/apply-migration.ts`
- [ ] `modules/record-foundation/src/index.ts`
- [ ] `modules/record-foundation/src/ports.ts`
- [ ] `modules/record-foundation/src/fastify.d.ts`
- [ ] `modules/record-foundation/src/router.ts`
- [ ] `modules/record-foundation/src/events/publishers/index.ts`
- [ ] `modules/record-foundation/src/events/consumers/index.ts`
- [ ] `modules/record-foundation/src/projections/index.ts`

### A2 — Drizzle Schema
- [ ] `modules/record-foundation/src/schema/tables.ts`
- [ ] `modules/record-foundation/migrations/001_create_record_foundation.sql`
- [ ] `modules/record-foundation/src/schema/apply-migration.ts`

### A3 — Service Scaffold
- [ ] `services/record-foundation-svc/project.json`
- [ ] `services/record-foundation-svc/package.json`
- [ ] `services/record-foundation-svc/tsconfig.json`
- [ ] `services/record-foundation-svc/tsup.config.ts`
- [ ] `services/record-foundation-svc/.env.example`
- [ ] `services/record-foundation-svc/.gitignore`
- [ ] `services/record-foundation-svc/src/main.ts`

### A4 — Workspace Registration
- [ ] `tsconfig.base.json` — add `@hims/record-foundation` path alias

---

## Phase B — Domain + Repos

### B1 — Domain Types
- [ ] `src/domain/care-context.ts`
- [ ] `src/domain/bundle-manifest.ts`
- [ ] `src/domain/external-record.ts`
- [ ] `src/domain/disclosure.ts`

### B2 — Data Access (Repos)
- [ ] `src/data-access/drizzle-care-contexts.repo.ts`
- [ ] `src/data-access/drizzle-bundle-manifests.repo.ts`
- [ ] `src/data-access/drizzle-bundle-storage.repo.ts`
- [ ] `src/data-access/drizzle-external-records.repo.ts`
- [ ] `src/data-access/drizzle-timeline-index.repo.ts`
- [ ] `src/data-access/drizzle-erasure-log.repo.ts`

---

## Phase C — Use-Cases

### C1 — Care Context Use-Cases
- [ ] `src/use-cases/create-care-context.ts`
- [ ] `src/use-cases/list-care-contexts.ts`
- [ ] `src/use-cases/get-care-context.ts`
- [ ] `src/use-cases/update-care-context-linkage.ts`
- [ ] `src/use-cases/bulk-update-linkage.ts`
- [ ] `src/use-cases/find-discoverable-contexts.ts`

### C2 — Bundle Use-Cases
- [ ] `src/use-cases/store-bundle.ts`
- [ ] `src/use-cases/evaluate-disclosure.ts`

### C3 — External Record Use-Cases
- [ ] `src/use-cases/ingest-external-record.ts`
- [ ] `src/use-cases/list-external-records.ts`
- [ ] `src/use-cases/get-external-record.ts`
- [ ] `src/use-cases/mark-external-record-viewed.ts`

---

## Phase D — REST Handlers

- [ ] `src/rest-handlers/care-contexts.ts`
- [ ] `src/rest-handlers/bundles.ts`
- [ ] `src/rest-handlers/disclosures.ts`
- [ ] `src/rest-handlers/external-records.ts`
- [ ] `src/rest-handlers/timeline.ts` (stub)
- [ ] `src/rest-handlers/admin.ts` (stub)
- [ ] `src/rest-handlers/schemas.ts`

---

## Phase E — Adapter Updates

- [ ] `modules/abdm-adapter/src/ports.ts` — add `ingestExternalRecord` to `RecordFoundationClient`
- [ ] `modules/abdm-adapter/src/data-access/record-foundation-client.http.ts` — update 3 methods + add ingest
- [ ] `modules/abdm-adapter/src/data-access/mock-platform-clients.ts` — add `ingestExternalRecord`

---

## Phase F — Docs

- [ ] `docs/architecture/lld/record-foundation/schema-reference.json` — fix `uq_care_contexts_source` unique constraint
- [ ] `specs/openapi/record-foundation.v1.yaml` — update paths, add endpoints, fix disclosure response
- [ ] `specs/events/record-foundation.events.yaml` — create event spec

---

## Phase G — Tests

- [ ] Domain type tests
- [ ] All 6 repo tests
- [ ] All 11 use-case tests
- [ ] Lint pass (`npx nx run record-foundation:lint`)
