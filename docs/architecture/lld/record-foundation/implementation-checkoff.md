# Record Foundation — Implementation Checkoff

All items below are completed for the simplified module (2 tables, 6 endpoints, 4 use-cases).

## Schema
- [x] `src/schema/tables.ts` — care_contexts + bundles
- [x] `migrations/001_create_record_foundation.sql` — full DDL
- [x] `src/domain/care-context.ts` — simplified types
- [x] `src/domain/bundle.ts` — merged domain type

## Data Access
- [x] `src/data-access/drizzle-care-contexts.repo.ts` — insert, findAll, findById
- [x] `src/data-access/drizzle-bundles.repo.ts` — insert, findById, findByCareContextId

## Use-Cases
- [x] `src/use-cases/create-care-context.ts`
- [x] `src/use-cases/list-care-contexts.ts`
- [x] `src/use-cases/get-care-context.ts`
- [x] `src/use-cases/store-bundle.ts`

## REST Handlers
- [x] `src/rest-handlers/care-contexts.ts` — GET list, GET by id, POST create
- [x] `src/rest-handlers/bundles.ts` — GET by id, GET by care-context, POST store
- [x] `src/rest-handlers/schemas.ts`

## Module Core
- [x] `src/index.ts`
- [x] `src/ports.ts`
- [x] `src/router.ts`
- [x] `src/events/publishers/index.ts`
- [x] `src/events/consumers/index.ts`

## Service
- [x] `services/record-foundation-svc/src/main.ts`

## Adapter Integration
- [x] `modules/abdm-adapter/src/ports.ts` — RecordFoundationClient: 2 methods
- [x] `modules/abdm-adapter/src/data-access/record-foundation-client.http.ts` — Http + NoOp
- [x] `modules/abdm-adapter/src/data-access/mock-platform-clients.ts` — Mock
- [x] `handle-discover-callback.ts` → listCareContexts
- [x] `handle-link-callback.ts` — removed markCareContextLinked
- [x] `handle-link-confirm-callback.ts` — removed markCareContextLinked
- [x] `push-health-information.ts` → listCareContexts + listBundles

## Docs
- [x] `specs/openapi/record-foundation.v1.yaml` — 6 paths, simplified models
- [x] `specs/events/record-foundation.events.yaml` — 2 events
- [x] `docs/architecture/lld/record-foundation/schema-reference.json` — 2 entities
- [x] `docs/architecture/lld/record-foundation/build-plan.md`
- [x] `.opencode/plans/record-foundation-simplify.md`

## Tests
- [x] 4 use-case tests passing
- [x] 97 abdm-adapter tests passing
- [x] Record-foundation lint clean
