---
title: Modules, services, and how they talk
objective: How a HIMS module is shaped, how services mount modules at deploy time, and the two ways modules communicate — sync HTTP (spec-first) and async events — plus the projection-vs-cache rule.
---

The repo has three layers that are easy to confuse:

- **`modules/*`** — the units of business logic. Framework-light, own a schema, know nothing about HTTP transport wiring.
- **`services/*`** — thin deployment wrappers. A service boots Fastify (or FastAPI), wires plugins, and **mounts one or more module routers**.
- **`packages/ts-sdk-*`** — shared libraries (events, db, identity, authz…) every module/service reuses.

The golden rule: **`modules/*` never import each other.** Cross-module talk is either an HTTP call (sync) or an event (async) — never a direct `import`.

<!-- chapter: Module anatomy -->

Every module follows the same folder contract. Here is `modules/billing` — a real, current TypeScript module:

```filetree
. modules/billing/src/
.   index.ts — public API: re-exports createRouter + a few constants
.   router.ts — mounts all handlers as a Fastify plugin
.   ports.ts — repository INTERFACES (BillingRepo, TariffMasterRepo)
.   domain/ — types, value objects (bill.types.ts, money math)
.   use-cases/ — one FUNCTION per file, deps injected (record-payment.ts …)
.   data-access/ — Drizzle repos: CLASSES implementing ports
.   rest-handlers/ — RESTful CRUD endpoints (functions)
.   schema/ — Drizzle tables + migrations (tables.ts)
.   authz/ — Cerbos target resolver
.   lib/ — module-local helpers (money, mappers, pagination)
```

Not every module has every folder — `billing` has no `events/` or `projections/` (it publishes nothing and keeps no remote read-copies yet). Modules that do: `registration/events/`, `pharmacy` (a projection), `record-foundation/projections/`, `configurator/events/`.

```callout tone=decision title="The one paradigm rule that trips people up"
**Use-cases are functions; adapters are classes.** The *layer* picks the paradigm — see `docs/architecture/lld/repo-structure/01-monorepo-setup.md` §2.5. A use-case is a plain async function that takes its dependencies as the first argument; a data-access repo is a class implementing a `ports.ts` interface.
```

```code lang=ts file=modules/billing/src/use-cases/record-payment.ts
// use-case = FUNCTION, deps injected as the first param (deps: BillingDeps)
export async function recordPayment(
  deps: BillingDeps,
  tenantId: string,
  input: RecordPaymentInput,
): Promise<UseCaseResult<{ payment_id: string; /* … */ }>> {
  const payment = await deps.billingRepo.insertPayment({ /* … */ });
  // …
}
```

```code lang=ts file=modules/billing/src/data-access/billing.repository.ts
// adapter = CLASS implementing the port declared in ports.ts
class DrizzleBillingRepo implements BillingRepo {
  constructor(private readonly db: DbInstance) {}
  async insertPayment(row: NewPaymentRow): Promise<PaymentRow> { /* … */ }
}
```

`ports.ts` is the seam between them — the use-case depends on the `BillingRepo` *interface*, the class supplies the Drizzle implementation. `router.ts` picks the implementation (real DB vs in-memory mock) and injects it.

<!-- chapter: Services mount modules -->

A service is deployment-time composition: it decides *which module routers run in this process*. Today the map is essentially **one domain module per service**, though a service can mount more.

```diagram title="Current service to module map" look=clean
flowchart LR
  web["web (React SPA)"] --> bff
  bff["bff (reverse proxy / token handler)"]
  bff -->|"/api/billing/v1"| bsvc["billing-svc"]
  bff -->|"/api/registration/v1"| rsvc["registration-svc"]
  bff -->|"/api/pharmacy/v1"| psvc["pharmacy-svc"]
  bff -->|"/api/configurator/v1"| csvc["configurator-svc"]
  bff -->|"/api/v1/opd"| osvc["opd-svc (Python)"]
  bff -->|"/api/v1/master-data"| msvc["master-data-svc (Python)"]
  bff -->|"/api/user-management"| usvc["user-management-svc"]
  bsvc --> bmod["@hims/billing"]
  rsvc --> rmod["@hims/registration"]
  psvc --> pmod["@hims/pharmacy"]
  csvc --> cmod["@hims/configurator"]
  osvc --> omod["opd module"]
  msvc --> mmod["master_data module"]
```

`services/billing-svc/src/main.ts` shows the pattern: register cross-cutting plugins (correlation-id, tenant, identity, authz), then `api.register(createRouter({ db, … }))` under the `/api/billing/v1` prefix.

```callout tone=info title="Why every TS service also imports @hims/user-management"
It is **not** mounting UM's routes. UM is imported as a *library* to wire the Cerbos PEP + principal-role enricher (the authz plugins need UM's repositories). Only the service's own domain router is mounted. `bff` mounts **no** module — it is a `@fastify/http-proxy` that forwards prefixes to upstream services and handles the auth token exchange. `web` is the React frontend.
```

<!-- chapter: Cross-module talk -->

Two mechanisms, chosen by whether the caller needs an answer *now*:

- **Sync = HTTP**, spec-first. Every module's surface is defined in `specs/openapi/<module>.v1.yaml` *before* handlers. Cross-module HTTP goes through a **port + hand-written adapter** (decision D3) — an interface in the caller's `ports.ts`, an adapter class in the *service* that does `fetch`.
- **Async = events** on the in-process bus (next chapter).

The canonical "reach-in done right" is **configurator → master-data**. Configurator used to JOIN master-data's `master_global.modules` table directly (a cross-schema read its own LLD forbade). It now calls a narrow internal HTTP route instead.

```api-endpoint method=GET path=/api/v1/master-data/internal/modules title="Master Data internal S2S catalog route"
. header x-master-data-internal-key string — shared-secret gate (not JWT)
response 200:
{ "data": [ { "id": "billing", "is_deleted": false } ] }
```

```diagram title="configurator to master-data (HTTP-first, no direct import)"
sequenceDiagram
  participant UC as configurator use-case
  participant Port as PlatformModuleCatalogPort
  participant Adp as HttpPlatformModuleCatalogClient
  participant MD as master-data-svc
  UC->>Port: listValidModuleIds()
  Port->>Adp: (adapter implements port)
  Adp->>MD: GET /internal/modules  (x-*-internal-key)
  MD-->>Adp: [ { id, is_deleted } ]
  Adp-->>UC: Set of valid module ids
```

```callout tone=warning title="This adapter deliberately has NO cache"
The house default is **HTTP + TTL cache + event-bust**, but `HttpPlatformModuleCatalogClient` (`services/configurator-svc/src/adapters/`) skips the cache on purpose: its result drives a *sticky* deactivation, so a stale cache could permanently disable a valid module. It also `throw`s on any non-2xx so a transient failure never looks like an empty catalog. The proper event-bust cache is deferred to Phase 5 (needs the event bridge).
```

<!-- chapter: Events -->

The event bus is `@hims/ts-sdk-events` → **`InProcessEventBus`** (ADR-0017): in-memory, `Map<event_type, Set<handler>>`, one bus **per process**, `validateEnvelope()` on publish. No broker, no outbox — Phase 0 only.

Every event is a validated **envelope** (`packages/ts-sdk-events/src/envelope.ts`):

```data-model title="DomainEvent envelope"
. DomainEvent
.   event_id uuid PK — UUIDv7, generated
.   event_type string — must match <module>.<entity>.<action>
.   source_module string
.   iq_tenant_id uuid — tenant scoping, on every event
.   occurred_at string — ISO-8601
.   published_at string — optional, for future brokers
.   correlation_id uuid
.   actor_id uuid
.   event_contract_version string — semver, e.g. 1.0.0
.   payload object — the rich body (see below)
```

```diagram title="publisher to bus to consumer" look=clean
flowchart LR
  P["registration use-case"] -->|"publishVisitCreated()"| E["createEnvelope()"]
  E -->|"registration.visit.created"| B["InProcessEventBus"]
  B --> H1["consumer A"]
  B --> H2["consumer B"]
```

```callout tone=decision title="Rich payloads, not just IDs"
`registration.visit.created` carries `patient_id, visit_type, status, facility_id, department_id, doctor_id, created_at …` — everything a consumer might project — not a bare `visit_id`. Consumers should not have to call back for the basics. See `modules/registration/src/events/publish-visit-created.ts`.
```

```callout tone=warning title="The Python↔TS event-bridge is a documented target, not built"
Because the bus is **in-process per service**, a subscriber in another service is effectively dangling across the process boundary. The async cross-process **event-bridge façade** (`/internal/events` receiver + a Python `py-sdk-events`) is explicitly **deferred to Phase 5** (decision D8) — `py-sdk-events` is unmerged and Python modules emit **no** events today. What actually crosses the Python→TS boundary right now is a **synchronous HTTP call** (httpx/fetch), e.g. OPD posting a dispense into pharmacy's queue. Do not describe the async bridge as working — it does not exist yet. Source: `docs/architecture/cleanup/event-bridge-52-build-plan.md`.
```

<!-- chapter: Projection vs HTTP+cache -->

When a module needs another module's data, the **default is HTTP + short TTL cache + event-bust invalidation**. A local **projection table** (a maintained read-copy) is justified only when *all four* hold: it is on a hot path, needs a local SQL JOIN, must survive the source being down, and tolerates eventual consistency.

<!-- tabs:start -->
<!-- tab: Projection (pharmacy queue) -->

`modules/pharmacy` keeps a `queue_projection` table — a denormalized read-copy of OPD visits ready for dispensing (patient name, uhid, doctor, medicine count…). It is queried for the pharmacy queue screen (search, paginate, filter — a real local JOIN/scan) and upserted from OPD via `upsertOpdQueueProjectionFromVisit`.

```code lang=ts file=modules/pharmacy/src/data-access/queue-projection.repo.ts
export class DrizzleQueueProjectionRepo {
  async upsert(tenantId: string, input: QueueProjectionUpsertInput) { /* onConflictDoUpdate */ }
  async listForQueue(tenantId: string, options): Promise<{ items; total }> { /* filter + paginate */ }
}
```

Note: today it is **HTTP-fed** (OPD pushes via an internal route), not yet event-fed — the event-fed version waits on the Phase-5 bridge.

<!-- tab: HTTP + no-cache (configurator) -->

`configurator → master-data` (previous chapter) is the opposite choice: a low-volume, admin-tier lookup that does **not** need a local copy, so it stays a live HTTP call through a port+adapter. It even skips the cache for the sticky-deactivation reason above. No projection table, no schema coupling.

<!-- tabs:end -->

```callout tone=info title="Where to look next"
Module contract: `docs/architecture/hld/03-module-shape-template.md` · layer/paradigm rules: `docs/architecture/lld/repo-structure/01-monorepo-setup.md` §2.5 · events: `packages/ts-sdk-events/src/` · projection doctrine + reach-in recon: `docs/architecture/cleanup/event-bridge-52-build-plan.md`.
```
