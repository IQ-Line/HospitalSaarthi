# Monorepo Structure and Developer Guide

> **Status:** Draft v0.1
>
> **Purpose:** This document defines the repository layout, package taxonomy, internal module structure, contract strategy, CI pipeline, and developer workflows for the HIMS platform. A developer reading this document should know where every file goes, how modules interact, and how to add a new module from scratch.
>
> **Cross-references:** [ADR-0016](../../adr/0016-polyglot-nx-monorepo-spec-first-contracts.md) (decision record) | [Module Shape Template](../../hld/03-module-shape-template.md) | [Database Principles](../../analysis/03-database-principles.md) | [Module Build Order](../../analysis/02-module-build-order.md)

---

## 1. Repository layout

```
hims-platform/
│
├── specs/                                  # ① Language-agnostic contracts
│   ├── openapi/
│   │   ├── user-management.v1.yaml
│   │   ├── configurator.v1.yaml
│   │   ├── empi.v1.yaml
│   │   └── master-data.v1.yaml
│   ├── events/
│   │   ├── _envelope.schema.json           # Standard event envelope (JSON Schema)
│   │   ├── user.events.yaml                # user.created, user.updated, etc.
│   │   ├── patient.events.yaml             # patient.created, patient.merged, etc.
│   │   ├── config.events.yaml              # config.changed, tenant.provisioned, etc.
│   │   └── master-data.events.yaml         # master-data.updated, tenant-override.changed
│   └── README.md                           # Spec authoring rules, versioning policy
│
├── packages/                               # ② Shared libraries
│   ├── ts-sdk-identity/                    # JWT verification via JWKS, principal construction
│   ├── ts-sdk-authz/                       # Cerbos PEP middleware, PlanResources → SQL helpers
│   ├── ts-sdk-events/                      # Event pub/sub adapter (bus-agnostic)
│   ├── ts-sdk-db/                          # Drizzle base config, audit columns, tenant_id helpers
│   ├── ts-sdk-tenant/                      # AsyncLocalStorage tenant context middleware
│   ├── ts-sdk-testing/                     # Test helpers: fixtures, mocks, integration DB setup
│   ├── ts-sdk-fhir/                        # FHIR R4 + NRCeS profile registry, builders, validators (ADR-0023)
│   ├── ts-sdk-abha/                        # ABHA domain types, validators, FHIR mapping, FSM state names
│   ├── py-sdk-fhir/                        # Python mirror of ts-sdk-fhir (skeleton; impl deferred until first Python FHIR service)
│   ├── py-sdk-abha/                        # Python mirror of ts-sdk-abha (skeleton; impl deferred until first Python ABDM service)
│   ├── openapi-clients/                    # Auto-generated typed HTTP clients from specs/
│   ├── eslint-config/                      # Shared ESLint config
│   └── tsconfig/                           # Shared tsconfig base files
│
├── modules/                                # ③ Module libraries (any language)
│   ├── user-management/
│   ├── configurator/
│   ├── empi/
│   └── master-data/
│
├── services/                               # ④ Deployment wrappers
│   ├── user-management-svc/                # Thin Fastify wrapper: imports module, wires adapters, starts server
│   ├── configurator-svc/
│   ├── empi-svc/
│   ├── master-data-svc/
│   ├── bff/                                # Platform BFF: JWT verify, routing, response aggregation
│   ├── web/                                # Frontend SPA — see Frontend Structure LLD
│   │   └── src/
│   │       ├── app/                        # Providers, layout
│   │       ├── routes/                     # TanStack Router file-based routes
│   │       ├── features/                   # Feature logic (api/, components/, store)
│   │       ├── stores/                     # Global Zustand stores (auth, tenant, permissions, ui-prefs)
│   │       ├── hooks/                      # Shared hooks
│   │       ├── lib/                        # API client, query client, Cerbos client, permissions helpers
│   │       └── styles/                     # Tailwind + Pulse CSS variables
│   └── embedded-clinic/                    # Future: multi-module single-process deployment
│
├── infra/                                  # ⑤ Infrastructure-as-code
│   ├── cerbos/
│   │   ├── policies/                       # YAML policy files (Git-versioned)
│   │   ├── tests/                          # cerbos test fixtures
│   │   └── cerbos.yaml                     # PDP configuration
│   ├── docker/
│   │   ├── docker-compose.yml              # Local dev: PostgreSQL + Citus, PgBouncer, Cerbos, event bus
│   │   └── Dockerfile.module-ts            # Multi-stage Dockerfile template for TS modules
│   └── db/
│       ├── pgbouncer.ini                   # Connection pooler config
│       ├── citus-init.sql                  # Citus extension setup, pg_stat_statements
│       └── pgtune.conf                     # Production-ready PostgreSQL tuning base
│
├── tools/                                  # ⑥ Build tooling and generators
│   ├── generators/
│   │   └── module/                         # Nx generator: scaffold a new module
│   └── scripts/
│       ├── validate-specs.ts               # CI: ensure module routes match OpenAPI specs
│       ├── generate-clients.ts             # Generate typed clients from specs/
│       └── ci-helpers/                     # Semgrep wrapper, coverage gate, etc.
│
├── tests/                                  # ⑦ Non-module tests
│   └── load/
│       ├── scenarios/                      # k6 load test scripts, organized by module
│       ├── lib/                            # Shared helpers (auth, tenant, config)
│       ├── thresholds.json                 # Pass/fail thresholds
│       └── project.json                    # Nx: run, run-all targets
│
├── docs/                                   # ⑧ Architecture documentation (existing)
│   └── architecture/
│
├── Makefile                                # Developer entry point: make setup, make dev, make ci-local
├── .env.example                            # All required env vars, documented
├── nx.json                                 # Nx workspace configuration
├── pnpm-workspace.yaml                     # pnpm workspace definition
├── package.json                            # Root: shared devDependencies, workspace scripts
├── tsconfig.base.json                      # Base TypeScript config
└── .github/
    └── workflows/
        ├── ci.yml                          # GitHub Actions CI pipeline (PR)
        └── load-test.yml                   # Scheduled/manual k6 load tests
```

### Why this layout

| Directory | Purpose | Key principle |
|-----------|---------|---------------|
| `specs/` | Language-agnostic API and event contracts | Contracts are independent of implementation language. A Python module and a TypeScript module consume the same YAML spec. |
| `packages/` | Shared TypeScript SDK + generated clients | SDK packages implement the cross-cutting concerns from the [module shape template](../../hld/03-module-shape-template.md). Non-TS modules implement the same protocols using their language's libraries. |
| `modules/` | Module libraries — pure business logic | No deployment opinion. No `main.ts`. Exports router, use-cases, event handlers. Data-access behind port interfaces. |
| `services/` | Deployment wrappers | Thin entry points that import modules and wire concrete adapters. This is where `main.ts` lives — not in the module. |
| `infra/` | Infrastructure configuration | Cerbos policies are code (Git-versioned, CI-tested). Docker Compose defines the local dev environment. Database config follows [database principles §13](../../analysis/03-database-principles.md#13-postgresql-production-tuning). |
| `tools/` | Build-time tooling | Nx generators enforce the module shape template. CI scripts validate spec-implementation consistency. |
| `tests/load/` | k6 load testing | JavaScript scripts, Nx project, nightly CI. Results export to LGTM stack (Grafana). Not in PR pipeline. |
| `Makefile` | Developer workflow entry point | `make setup`, `make dev`, `make ci-local`. Wraps multi-step orchestration (docker, migrations, seed). |
| `.env.example` | Environment variable documentation | Copied to `.env` by `make setup`. Documents every required variable for local development. |

---

## 2. Internal module structure

Every module — regardless of language — follows the same conceptual layers. This is the code-level realization of the [module shape template](../../hld/03-module-shape-template.md) and the vertical slice architecture from the reference project.

### 2.1 TypeScript module

```
modules/user-management/
├── src/
│   ├── ports.ts                            # Repository interfaces (data-access contracts)
│   ├── domain/                             # Core business types, value objects, invariants
│   │   ├── user.types.ts
│   │   └── role.types.ts
│   ├── use-cases/                          # One file per business action (pure logic)
│   │   ├── create-user.ts
│   │   ├── assign-role.ts
│   │   ├── authenticate-local.ts
│   │   ├── federate-login.ts
│   │   └── deactivate-user.ts
│   ├── data-access/                        # Drizzle repository implementations (adapters)
│   │   ├── user.repo.ts
│   │   └── role.repo.ts
│   ├── http-handlers/                      # Intent-based API handlers
│   │   ├── create-user.handler.ts
│   │   ├── assign-role.handler.ts
│   │   └── authenticate.handler.ts
│   ├── rest-handlers/                      # RESTful CRUD endpoints (where needed)
│   │   ├── users.handler.ts                # GET /users, GET /users/:id
│   │   └── roles.handler.ts               # GET /roles
│   ├── events/
│   │   ├── publishers/                     # Events this module emits
│   │   │   └── user-events.publisher.ts
│   │   └── consumers/                      # Events from other modules
│   │       └── config-changed.consumer.ts
│   ├── projections/                        # Local read projections from other modules
│   │   └── tenant.projection.ts            # Synced from Configurator events
│   ├── schema/                             # Drizzle schema definitions + migrations
│   │   ├── tables.ts                       # Table definitions (user_management.* schema)
│   │   └── migrations/                     # drizzle-kit generated migrations
│   ├── router.ts                           # Mounts all handlers, exports Express/Hono router
│   └── index.ts                            # Public API: exports router, types, event handlers
│
├── test/
│   ├── unit/                               # Use-case tests (mocked ports)
│   │   └── create-user.test.ts
│   ├── integration/                        # Data-access tests (real DB)
│   │   └── user.repo.test.ts
│   └── fixtures/                           # Test data factories
│       └── user.fixtures.ts
│
├── package.json
├── tsconfig.json
└── project.json                            # Nx project configuration
```

### 2.2 Python module

```
modules/ai-prescription/
├── src/
│   ├── ports.py                            # Repository interfaces (Protocol classes)
│   ├── domain/
│   │   └── prescription.py
│   ├── use_cases/
│   │   └── extract_prescription.py
│   ├── data_access/
│   │   └── prescription_repo.py            # SQLAlchemy or raw SQL
│   ├── http_handlers/
│   │   └── extract.py                      # FastAPI route handlers
│   ├── events/
│   │   ├── publishers/
│   │   └── consumers/
│   ├── models/                             # SQLAlchemy models + Alembic migrations
│   └── main.py                             # FastAPI app factory (used by service wrapper)
│
├── tests/
│   ├── unit/
│   └── integration/
│
├── pyproject.toml                          # Managed by uv — deps, scripts, tool config
├── uv.lock                                 # uv lockfile (committed)
├── project.json                            # Nx targets: lint→ruff, test→pytest, build→docker
└── Dockerfile
```

### 2.3 Layer rules

These rules apply to every module regardless of language. They are the discipline that enables offline support, testability, and deployment flexibility.

| Layer | May import from | Must NOT import from | Responsibility |
|-------|----------------|---------------------|----------------|
| **domain/** | Nothing (pure types) | Everything else | Business types, value objects, invariants. No framework imports. |
| **use-cases/** | `domain/`, `ports.ts` | `data-access/`, `http-handlers/`, any framework | Pure business logic. One file per action. Reads like a standard operating procedure. No SQL, no HTTP, no framework code. |
| **data-access/** | `domain/`, `ports.ts`, ORM/DB libraries | `use-cases/`, `http-handlers/` | Implements port interfaces. Contains all SQL/ORM code. Does not enforce business rules — just fetches and saves. |
| **http-handlers/** | `domain/`, `use-cases/` (via ports), validation library (Zod) | `data-access/` | Translates HTTP requests to use-case calls. Validates input against OpenAPI-derived types. Formats responses. No business logic. |
| **events/** | `domain/`, `use-cases/` (via ports), event SDK | `http-handlers/`, `data-access/` directly | Publishers emit domain events after use-case completion. Consumers handle events from other modules and call use-cases. |
| **projections/** | `domain/`, event SDK, DB libraries | `use-cases/` | Maintains local read copies of other modules' data. Updated by event consumers. Queryable by data-access layer. |
| **schema/** | ORM library | Everything else | Table definitions, migrations. Enforces [database principles](../../analysis/03-database-principles.md): `tenant_id` on every table, audit columns, no cross-schema FKs. |

**The critical rule:** Use-cases import from `ports.ts` (interfaces), never from `data-access/` directly. The service wrapper in `services/` injects the concrete data-access implementation. This is what makes the module portable across deployment modes.

```typescript
// modules/empi/src/use-cases/search-patient.ts

import type { PatientRepo } from '../ports';
import type { SearchResult } from '../domain/patient.types';

export function createSearchPatient(repo: PatientRepo) {
  return async (criteria: SearchCriteria): Promise<SearchResult[]> => {
    const candidates = await repo.findByCriteria(criteria);
    return rankByMatchConfidence(candidates);
  };
}
```

```typescript
// services/empi-svc/src/main.ts

import { createRouter } from '@hims/empi';
import { DrizzlePatientRepo } from '@hims/empi/data-access';
import { db } from './db';               // Drizzle connection, wired here
import { eventBus } from './event-bus';   // Kafka/NATS connection, wired here

const patientRepo = new DrizzlePatientRepo(db);
const router = createRouter({ patientRepo, eventBus });

app.use('/empi', router);
app.listen(3000);
```

### 2.4 Intent-based vs. RESTful handlers

The platform uses **intent-based (task-based) APIs as the default**, with RESTful endpoints where they genuinely fit. This is adapted from the reference project's philosophy: APIs model what the user is trying to do, not what database table they're touching.

**Intent-based handlers** (in `http-handlers/`):
- Named after the business action: `register-patient.handler.ts`, `assign-role.handler.ts`, `dispense-medication.handler.ts`
- Use `POST` for actions that change state, regardless of whether they create, update, or orchestrate
- Request body is a rich command payload validated against the OpenAPI spec
- One handler per file, one use-case per handler

**RESTful handlers** (in `rest-handlers/`):
- Named after the resource: `users.handler.ts`, `patients.handler.ts`
- Standard `GET` for lookups and listings, `PATCH` for simple attribute updates
- Appropriate for: read endpoints, search/filter endpoints, simple CRUD that doesn't involve workflow logic

**How to decide:** If the operation has business rules, status transitions, or orchestrates multiple entities — it's intent-based. If it's a straightforward lookup or a simple field update — it's RESTful. When in doubt, prefer intent-based.

The separation into two directories (`http-handlers/` vs `rest-handlers/`) makes this visible in the file tree. Both directories' handlers are mounted by `router.ts`.

### 2.5 Programming paradigm and SOLID principles

**The rule is: the layer determines the paradigm.** This is not a recommendation or a preference — it is a deterministic decision. A developer never asks "should this be a function or a class?" The layer answers it: **stateless logic is a function, stateful components are classes.** Every module follows the same pattern, so a developer reading any module sees the same structure.

This is not a compromise between paradigms. The alternatives — all-FP or all-OOP per module — were evaluated and rejected:

- **All-FP** forces data-access adapters into factory-functions returning closures over a mutable `db` reference. This works, but you lose `class DrizzlePatientRepo implements PatientRepo` — TypeScript's natural way to enforce that an adapter satisfies a port. Closures capturing mutable state are classes in disguise, written without the syntax that makes them readable.
- **All-OOP** forces use-cases into single-method classes (`class RegisterPatientUseCase { execute() {} }`). The class has no state between calls — it exists purely for constructor injection ceremony. In TypeScript this is boilerplate without benefit. The Express/MongoDB background of most team members makes this pattern unfamiliar and unnecessarily verbose.
- **Per-module paradigm consistency** (some modules all-FP, others all-OOP) means developers must remember which module uses which pattern, and learn two ways to express identical architectural intent. One deterministic rule across all modules is cheaper to learn and enforce.

#### Paradigm rule by layer

| Layer | Paradigm | Rule |
|-------|----------|------|
| **domain/** | Types + pure functions for value objects. **Classes for entities with lifecycle behavior** (state machines, merge logic, validation inseparable from data). | If the domain concept has behavior that enforces invariants or manages state transitions → class. If it's a data shape (DTO, event payload, query filter) → plain type. |
| **use-cases/** | **Functions.** One exported factory function per file. Dependencies injected as parameters. | Always a function. A use-case has no state between calls — it takes input, calls ports, enforces rules, returns output. If someone writes a use-case class with a single `execute()` method, that is a code review comment: "this should be a function." |
| **data-access/** | **Classes.** Constructor injection for DB connections, caches, and configuration. Implements port interfaces. | Always a class. Adapters hold stateful resources (`db` connections, cache clients). `class DrizzlePatientRepo implements PatientRepo` is how TypeScript enforces port compliance. The class is substitutable — `DrizzlePatientRepo`, `IndexedDBPatientRepo`, and `MockPatientRepo` all satisfy the same interface. |
| **http-handlers/** | **Functions.** Stateless request → response translation. | Always a function. Handlers validate input, delegate to a use-case, format the response. No state, no lifecycle. |
| **events/** | **Classes for bus adapters** (connection management, subscription lifecycle). **Functions for individual event handlers** (stateless: receive event, call use-case). | The bus client manages connections, reconnection, and subscriptions — a class with lifecycle methods (`connect()`, `subscribe()`, `disconnect()`). Individual handlers are stateless: receive event payload, call a use-case. |

**The code review test:** every class in the codebase must hold state (a DB connection, an event bus subscription, an entity's lifecycle). A stateless class with a single method is a function that hasn't been refactored yet.

#### Where OOP shines — concrete examples

**Domain entities with state machines.** A visit in the OPD module has a lifecycle: `registered → waiting → in_progress → completed`. The valid transitions, the rules governing them (e.g., cannot move to `completed` without vitals recorded), and the side effects (e.g., emit `visit.status-changed` event) are behavior that belongs with the entity:

```typescript
// domain/visit.ts — class with lifecycle behavior

export class Visit {
  constructor(
    private readonly id: string,
    private readonly tenantId: string,
    private status: VisitStatus,
    private readonly vitals: Vitals | null,
  ) {}

  beginConsultation(): void {
    if (this.status !== 'waiting') {
      throw new DomainError(`Cannot begin consultation from status '${this.status}'`);
    }
    this.status = 'in_progress';
  }

  complete(): void {
    if (this.status !== 'in_progress') {
      throw new DomainError(`Cannot complete from status '${this.status}'`);
    }
    if (!this.vitals) {
      throw new DomainError('Vitals must be recorded before completing visit');
    }
    this.status = 'completed';
  }

  get currentStatus(): VisitStatus { return this.status; }
}
```

This is natural OOP — the invariants (valid transitions, required vitals) are enforced by the class. A use-case function calls `visit.complete()` and gets the domain rule for free. Splitting this into separate functions and a plain data type would scatter the invariants across files.

**Data-access adapters.** Repositories are classes with constructor-injected dependencies. This is the standard Dependency Inversion pattern — the adapter implements a port interface, and the service wrapper chooses the concrete implementation:

```typescript
// data-access/drizzle-patient.repo.ts

export class DrizzlePatientRepo implements PatientRepo {
  constructor(private readonly db: DrizzleDB) {}

  async findByCriteria(tenantId: string, criteria: SearchCriteria): Promise<Patient[]> {
    return this.db.select().from(patients)
      .where(and(eq(patients.tenantId, tenantId), /* criteria */));
  }

  async create(patient: NewPatient): Promise<Patient> {
    const [created] = await this.db.insert(patients).values(patient).returning();
    return created;
  }
}
```

**Event bus adapter.** Connection management, reconnection logic, and subscription lifecycle are stateful concerns:

```typescript
// ts-sdk-events — event bus adapter (class with lifecycle)

export class NatsEventBus implements EventBus {
  private connection: NatsConnection | null = null;

  constructor(private readonly config: EventBusConfig) {}

  async connect(): Promise<void> {
    this.connection = await connect({ servers: this.config.url });
  }

  async publish(event: DomainEvent): Promise<void> {
    await this.connection!.publish(event.event_type, JSON.stringify(event));
  }

  async subscribe(eventType: string, handler: EventHandler): Promise<Subscription> {
    const sub = this.connection!.subscribe(eventType);
    // ... wire handler
    return sub;
  }

  async disconnect(): Promise<void> {
    await this.connection?.drain();
  }
}
```

#### Where functions are the better fit — concrete examples

**Use-cases.** A use-case is a single business action. Its dependencies are injected as parameters, making it trivially testable and portable:

```typescript
// use-cases/register-patient.ts

import type { PatientRepo, EventPublisher } from '../ports';
import type { RegisterPatientInput } from '../domain/patient.types';

export function createRegisterPatient(deps: {
  patientRepo: PatientRepo;
  eventPublisher: EventPublisher;
}) {
  return async (input: RegisterPatientInput) => {
    const existing = await deps.patientRepo.findByCriteria(
      input.tenantId,
      { phone: input.phone, dateOfBirth: input.dateOfBirth },
    );

    if (existing.length > 0) {
      return { matched: true, candidates: existing };
    }

    const patient = await deps.patientRepo.create(input);
    await deps.eventPublisher.publish({
      event_type: 'patient.created',
      payload: patient,
    });

    return { matched: false, patient };
  };
}
```

**HTTP handlers.** Stateless translators between HTTP and use-cases:

```typescript
// http-handlers/register-patient.handler.ts

import type { RegisterPatientUseCase } from '../use-cases/register-patient';

export function createRegisterPatientHandler(registerPatient: RegisterPatientUseCase) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const input = RegisterPatientSchema.parse(req.body);
    const result = await registerPatient(input);
    res.status(result.matched ? 200 : 201).json(result);
  };
}
```

#### How they interoperate

OOP and FP code coexist naturally within the same module. The boundaries are clean — classes implement port interfaces, functions consume them:

```typescript
// services/empi-svc/src/main.ts — composition root

// OOP: class-based adapters, instantiated with dependencies
const patientRepo = new DrizzlePatientRepo(db);
const eventBus = createEventBus({ type: process.env.EVENT_BUS_TYPE || 'in-process' });

// FP: function-based use-cases, wired with adapters
const registerPatient = createRegisterPatient({ patientRepo, eventPublisher: eventBus });
const searchPatient = createSearchPatient({ patientRepo });

// FP: function-based handlers, wired with use-cases
const registerHandler = createRegisterPatientHandler(registerPatient);

// Mount
router.post('/patients/register', registerHandler);
```

The service wrapper (`main.ts`) is the **composition root** — the single place where OOP adapters and FP use-cases are wired together. This is the Dependency Inversion Principle in action: high-level policy (use-cases) depends on abstractions (ports), low-level details (adapters) implement them, and the composition root binds them.

#### What to avoid universally

Regardless of paradigm choice:

- **God-classes.** A `PatientService` class with `create`, `update`, `search`, `merge`, `deactivate`, `export`, and `generateReport` methods. This violates Single Responsibility and becomes a merge-conflict magnet. Split into one-use-case-per-file functions instead.
- **Deep inheritance hierarchies.** Prefer composition over inheritance. A `BaseRepository → TenantScopedRepository → AuditedRepository → PatientRepository` chain is fragile. Use mixins, composition, or shared helper functions.
- **Stateful singletons.** Database connections, event bus instances, and caches are injected by the service wrapper, not imported as module-level singletons. Singletons hide dependencies and make testing painful.
- **Business logic in adapters.** Data-access classes fetch and save. They do not enforce business rules — that belongs in use-cases or domain entities. A repository that throws `"Patient already has an open visit"` is doing the use-case's job.

#### How SOLID is satisfied

The architecture satisfies all five SOLID principles through the interplay of function-based use-cases and class-based adapters.

**Single Responsibility.** One use-case per file. One handler per file. Each repository method does one query. Domain entity classes encapsulate one entity's invariants. A developer opening `register-patient.ts` knows it does exactly one thing.

**Open/Closed.** Modules are extended by adding new files, not modifying existing ones. A new use-case is a new file. A new event consumer is a new file. A new adapter is a new class implementing an existing port. Database extensions follow [database principles §6](../../analysis/03-database-principles.md#6-extend-with-new-tables-not-new-required-columns): new tables over new required columns.

**Liskov Substitution.** Any adapter implementing a port interface is substitutable without the consumer knowing. `DrizzlePatientRepo`, `IndexedDBPatientRepo`, and `MockPatientRepo` all satisfy the `PatientRepo` port. Use-cases call `repo.findByCriteria()` and don't know which implementation they got. This is subtype polymorphism via TypeScript interfaces — the same guarantee as classical OOP, whether the consumer is a function or a class.

**Interface Segregation.** Ports are narrow and purpose-specific. A use-case that only reads patients depends on `PatientReadRepo` (with `findById`, `findByCriteria`), not a god-interface that also includes `merge`, `delete`, and `bulkImport`. The SDK follows the same principle: split into focused packages (`ts-sdk-identity`, `ts-sdk-authz`, `ts-sdk-events`, etc.) rather than a monolithic `platform-sdk`.

**Dependency Inversion.** High-level modules (use-cases) depend on abstractions (port interfaces defined in `ports.ts`). Low-level modules (data-access adapters) implement those abstractions. The service wrapper in `services/` is the composition root where concretions are chosen and injected. Both FP function injection and OOP constructor injection achieve this inversion — the architecture uses whichever is natural for the layer:

```
┌─────────────────────────────────────────────────────┐
│  Composition Root (services/*-svc/main.ts)          │
│                                                     │
│  const repo = new DrizzlePatientRepo(db);      ←── OOP: constructor injection
│  const useCase = createRegisterPatient({ repo }); ←── FP: function injection
│  const handler = createHandler(useCase);       ←── FP: function injection
└─────────────────────────────────────────────────────┘
         │                       │
         ▼                       ▼
   ┌───────────┐          ┌──────────────┐
   │  ports.ts  │          │  ports.ts     │
   │ (interface)│          │ (interface)   │
   └───────────┘          └──────────────┘
         ▲                       ▲
         │                       │
   ┌───────────┐          ┌──────────────┐
   │ Adapter   │          │  Use-case     │
   │ (class)   │          │  (function)   │
   └───────────┘          └──────────────┘
```

Both arrows point toward the abstraction (`ports.ts`). Neither the use-case nor the adapter knows about the other's concrete type. This is textbook Dependency Inversion regardless of whether it's implemented with classes or functions.

---

## 3. Spec-first contract workflow

### 3.1 OpenAPI specs

Each module's API is defined in `specs/openapi/<module>.v1.yaml`. This is the source of truth for the module's HTTP interface.

**Authoring workflow:**

1. Write or update the OpenAPI spec in `specs/openapi/`.
2. Run `nx run openapi-clients:generate` — this regenerates typed clients in `packages/openapi-clients/`.
3. Implement or update handlers in the module to match the spec.
4. CI validates that the module's routes cover the spec (no missing endpoints, no undocumented endpoints).

**What the spec defines:**
- Paths, methods, request/response schemas
- Authentication requirements (`bearerAuth` with JWT)
- Common parameters (`iq_tenant_id` header or path parameter)
- Error response shapes (standardized across modules)

**What the spec does NOT define:**
- Internal data model (Drizzle schemas are private to the module)
- Implementation details (which use-cases are called, how data is stored)
- Event contracts (those are in `specs/events/`)

**Versioning:** Specs are versioned in the filename (`v1`, `v2`). Breaking changes require a new version. Non-breaking additions (new optional fields, new endpoints) can be added to the current version. The versioning policy is documented in `specs/README.md`.

### 3.2 Event schemas

Each module's published events are defined in `specs/events/<module>.events.yaml`. The file contains JSON Schema definitions for each event's payload, plus metadata (when the event is emitted, expected consumers).

**Standard event envelope** (`specs/events/_envelope.schema.json`):

```json
{
  "event_id": "uuid-v7",
  "event_type": "empi.patient.created",
  "source_module": "empi",
  "iq_tenant_id": "uuid",
  "timestamp": "ISO-8601",
  "correlation_id": "uuid",
  "actor_id": "uuid",
  "schema_version": "1.0.0",
  "payload": {}
}
```

The `payload` shape is defined per event type in the module's event schema file. The `ts-sdk-events` package validates payloads against these schemas at publish time in development/test environments.

### 3.3 Generated clients

`packages/openapi-clients/` contains auto-generated TypeScript types and HTTP client functions for every module's API. Generated by `openapi-typescript` + `openapi-fetch` from the specs.

A module calling another module imports from this package:

```typescript
import { empiClient } from '@hims/openapi-clients';

const patient = await empiClient.GET('/patients/{id}', {
  params: { path: { id: patientId } },
  headers: { authorization: `Bearer ${serviceToken}` },
});
```

The client is fully typed — path parameters, query parameters, request body, and response body are all inferred from the OpenAPI spec. No manual type definitions.

For Python modules, clients are generated using `openapi-generator` for Python, producing typed Pydantic models and an HTTP client.

---

## 4. Shared SDK packages

Each `packages/ts-sdk-*` package implements one cross-cutting concern from the [module shape template](../../hld/03-module-shape-template.md). Modules depend only on the SDK packages they need.

| Package | Module shape section | What it provides |
|---------|---------------------|-----------------|
| `ts-sdk-identity` | §3 Identity adapter | `verifyToken(token): Promise<Principal>`, `getJWKS()`, JWKS caching with TTL, `IdentityProvider` interface for multi-IdP support |
| `ts-sdk-authz` | §2 PEP middleware | `createPepMiddleware(config)`, `checkResources()`, `planResources()` helpers, request-scoped decision cache, Cerbos gRPC client |
| `ts-sdk-events` | §6 Event publication | `createEventBus(config)`, `createPublisher(config)`, `createConsumer(config)`, bus-agnostic interface. **Phase 0: `InProcessEventBus` adapter** — synchronous in-process dispatch, envelope validation on every publish ([ADR-0017](../../adr/0017-in-process-event-bus-phase-0.md)). Future: Kafka/NATS adapters. |
| `ts-sdk-db` | [DB principles](../../analysis/03-database-principles.md) | Base Drizzle column definitions (`tenantId`, `createdAt`, `updatedAt`, `createdBy`, `updatedBy`), `distributedTable()` helper, sequence counter utilities, `withTenant()` query wrapper |
| `ts-sdk-tenant` | §10 Multi-tenancy | `tenantMiddleware()` — extracts `iq_tenant_id` from JWT, stores in `AsyncLocalStorage`, makes it available to data-access layer. `getTenantId()` accessor. |
| `ts-sdk-testing` | — | Tenant fixtures, mock event bus (in-memory), mock Cerbos (always-allow / always-deny / policy-based), integration test database setup (per-test schema, cleanup), test principal factories |

**Non-TypeScript modules** do not use these packages. They implement the same protocols using their language's ecosystem:

| Protocol | TypeScript SDK | Python equivalent |
|----------|---------------|-------------------|
| JWT verification | `ts-sdk-identity` | `PyJWT` + JWKS fetcher |
| Cerbos authorization | `ts-sdk-authz` | `cerbos-sdk-python` |
| Event bus | `ts-sdk-events` | `confluent-kafka-python` or `nats-py` |
| Database | `ts-sdk-db` (Drizzle) | SQLAlchemy + Alembic |
| Tenant context | `ts-sdk-tenant` | `contextvars` (Python's equivalent of AsyncLocalStorage) |

The language-agnostic contract is the protocol (JWKS endpoint, Cerbos gRPC, event bus wire format, PostgreSQL schema conventions). The SDK is a convenience, not a requirement.

---

## 5. Service wrappers

Each deployable module gets a thin wrapper in `services/`. The wrapper's responsibilities are:

1. Create the HTTP server (Fastify for TypeScript, FastAPI for Python — [ADR-0019](../../adr/0019-fastify-node24-lts.md))
2. Connect to the database (Drizzle → PostgreSQL)
3. Connect to the event bus (InProcessEventBus for Phase 0 — [ADR-0017](../../adr/0017-in-process-event-bus-phase-0.md))
4. Instantiate data-access adapters and inject them into the module
5. Mount the module's router as a Fastify plugin
6. Configure health check and readiness endpoints
7. Start the server

**Example: `services/empi-svc/`**

```
services/empi-svc/
├── src/
│   ├── main.ts                 # Entry point (~30-50 lines)
│   ├── adapters.ts             # Wires concrete adapters to module ports
│   └── config.ts               # Reads env vars, Configurator cache
├── package.json                # Depends on @hims/empi, @hims/ts-sdk-*
├── project.json                # Nx: build, serve, docker targets
└── Dockerfile                  # Or references infra/docker/Dockerfile.module-ts
```

```typescript
// services/empi-svc/src/main.ts (simplified)

import Fastify from 'fastify';
import { createRouter, createEventConsumers } from '@hims/empi';
import { DrizzlePatientRepo } from '@hims/empi/data-access';
import { identityPlugin } from '@hims/ts-sdk-identity';
import { tenantPlugin } from '@hims/ts-sdk-tenant';
import { pepPlugin } from '@hims/ts-sdk-authz';
import { createEventBus } from '@hims/ts-sdk-events';
import { drizzle } from 'drizzle-orm/node-postgres';

const app = Fastify({ logger: true });

// Plugins (encapsulated scope — each gets isolated context)
await app.register(identityPlugin, { jwksUrl: process.env.JWKS_URL });
await app.register(tenantPlugin);
await app.register(pepPlugin, { cerbosUrl: process.env.CERBOS_URL });

// Wire adapters
const db = drizzle(process.env.DATABASE_URL);
const eventBus = createEventBus({ type: process.env.EVENT_BUS_TYPE || 'in-process' });
const patientRepo = new DrizzlePatientRepo(db);

// Mount module router as Fastify plugin
await app.register(createRouter({ patientRepo, eventBus }), { prefix: '/empi' });

// Start event consumers and HTTP server
const consumers = createEventConsumers({ patientRepo, eventBus });
await consumers.start();

await app.listen({ port: Number(process.env.PORT) || 3000, host: '0.0.0.0' });
```

Key Fastify patterns:
- `app.register()` instead of `app.use()` — each plugin gets an encapsulated scope (decorators/hooks don't leak between modules)
- SDK packages export Fastify plugins (`identityPlugin`, `tenantPlugin`, `pepPlugin`) instead of Express middleware
- Built-in Pino logger — structured JSON logs with request-id correlation, no separate morgan/winston
- `await app.listen({ port, host })` — explicit host binding, async startup

### Non-module services

| Service | Purpose | Notes |
|---------|---------|-------|
| `services/bff/` | Platform BFF | JWT verification (via `ts-sdk-identity`), request routing to modules (proxy or import), response aggregation for frontend, CORS, rate limiting |
| `services/web/` | Frontend SPA | React app. Consumes generated typed clients from `packages/openapi-clients/`. Future: PWA shell for offline support. |
| `services/embedded-clinic/` | Multi-module single process | Future: imports routers from multiple modules, shared DB connection, in-process event bus. For small clinic deployments. |

---

## 6. Deployment modes

The same module code supports three deployment topologies. The choice is per-hospital, not per-module.

### 6.1 Service mode (production default)

Each module runs as its own Kubernetes pod via its `services/*-svc/` wrapper. The BFF routes requests. Modules communicate via the event bus (async) and HTTP (sync, where justified). Each pod includes a Cerbos PDP sidecar.

```
┌──────────┐     ┌──────────────────────┐     ┌──────────────────────┐
│   BFF    │────▶│  user-management-svc │     │      empi-svc        │
│          │────▶│  + Cerbos sidecar    │     │  + Cerbos sidecar    │
└──────────┘     └──────────────────────┘     └──────────────────────┘
                          │                            │
                          └──────── Event Bus ─────────┘
                          │                            │
                    ┌─────┴─────┐              ┌───────┴──────┐
                    │ PostgreSQL │              │  PostgreSQL   │
                    │ (user_mgmt │              │  (empi schema)│
                    │  schema)   │              │               │
                    └───────────┘              └───────────────┘
```

### 6.2 Embedded mode (small clinic / lite deployment)

A single host process in `services/embedded-clinic/` imports multiple module routers. Shared database connection, in-process event dispatcher (no external event bus), single Cerbos PDP.

### 6.3 Offline mode (future — critical workflows only)

The frontend bundles use-case logic from selected modules. Data-access adapters target IndexedDB instead of PostgreSQL. A sync engine queues writes and reconciles with the server when connectivity returns.

**What makes this possible:** Use-cases import from `ports.ts`, not from `data-access/` directly. The module library has no dependency on PostgreSQL, Express, or any server-side runtime. It's pure TypeScript logic that can run in Node.js or in the browser.

**Phase 0 discipline (required now):**
- Use-cases must never import from `data-access/` or any server-only library
- All database access goes through port interfaces
- The module's `package.json` must not list `drizzle-orm`, `postgres`, or similar as direct dependencies — those belong in the service wrapper's `package.json`

**Phase 2+ engineering (deferred):**
- `packages/ts-sdk-offline/` — sync engine, conflict resolution, local event queue
- IndexedDB adapters for critical module data-access interfaces
- PWA service worker infrastructure in `services/web/`
- Selective module bundling (only critical use-cases, not entire modules)

---

## 7. CI pipeline

Adapted from the reference project's CI flow, modified for polyglot Nx and the HIMS platform requirements.

### 7.1 Pipeline stages

```
PR opened
  │
  ▼
① Base branch sync check
  │
  ▼
② Static analysis (affected only)
  ├── TypeScript: ESLint (eslint-plugin-sonarjs, eslint-plugin-security)
  ├── Python: ruff
  └── All: Semgrep (security patterns)
  │
  ▼
③ Type checking (affected only)
  ├── TypeScript: tsc --noEmit (with --incremental for speed)
  └── Python: mypy / pyright
  │
  ▼
④ Spec validation (affected only)
  └── openapi-diff: ensure module routes match their OpenAPI spec
  │
  ▼
⑤ Unit tests (affected only)
  ├── TypeScript: Vitest
  └── Python: pytest
  │
  ▼
⑥ Coverage gate
  └── Thresholds per project (branches: 80%, functions: 80%, lines: 80%)
  │
  ▼
⑦ Integration tests (affected only)
  └── Real database (Citus), real Cerbos, mock event bus
  │
  ▼
⑧ Cerbos policy tests
  └── cerbos test against infra/cerbos/tests/ fixtures
  │
  ▼
⑨ E2E tests (affected only, if applicable)
  └── Playwright against deployed services
  │
  ▼
⑩ AI code review (agentic)
  ├── Architecture review agent (checks module shape compliance, layer violations)
  ├── Code quality review agent (complexity, security, patterns)
  └── Arbiter agent (CI_DECISION: PASS/FAIL)
```

**Stage ordering principle:** Fast, deterministic checks first. Expensive checks last. AI review runs after E2E so the review agents have full test results (including failures and coverage) as context — a test failure that the code review also flags is deduplicated, and the review can distinguish "untested code" from "tested-and-broken code."

### 7.2 Nx commands

```bash
# PR pipeline (affected only — runs what changed)
nx affected -t lint --parallel=3
nx affected -t typecheck --parallel=3
nx affected -t validate-spec
nx affected -t test --parallel=2
nx affected -t test:integration
nx affected -t e2e

# Full pipeline (all projects — nightly or release)
nx run-many -t lint --parallel=3
nx run-many -t typecheck --parallel=3
nx run-many -t test --parallel=2
```

### 7.3 Local development

A `Makefile` at the monorepo root is the single developer entry point for multi-step workflows. It wraps the orchestration (docker-compose up, wait for healthy, run migrations, seed) that pnpm scripts handle poorly. Individual Nx commands remain available for targeted operations.

**Key Makefile targets:**

| Target | What it does |
|--------|-------------|
| `make setup` | Full bootstrap: check prereqs, copy `.env`, install deps, start docker, migrate, seed |
| `make dev` | Start all services via `nx run-many -t serve` |
| `make dev-module m=empi-svc` | Start a single module service |
| `make dev-web` | Start only the frontend |
| `make ci-local` | Run the full PR pipeline locally (same checks as CI) |
| `make test` | Run affected tests |
| `make db-reset` | Drop, recreate, migrate, seed |
| `make db-studio` | Open Drizzle Studio |
| `make infra` | Start docker infrastructure only (PostgreSQL+Citus, PgBouncer, Cerbos) |
| `make infra-down` | Stop docker infrastructure |
| `make help` | Show all available targets |

**New developer onboarding (3 commands):**

```bash
git clone <repo>
cd hims-platform
make setup          # installs deps, starts docker, runs migrations, seeds data
make dev            # starts all services
```

**Environment variables:** `.env.example` at the root documents every required variable. `make setup` copies it to `.env` if the file doesn't exist. Variables include database URL, PgBouncer URL, Cerbos URL, JWKS URL, better-auth secret, event bus type, frontend API base URL, and OTEL exporter endpoint.

**Nx commands (available directly for targeted work):**

```bash
nx affected -t test                      # Run tests for what you changed
nx run user-management:test              # Run a specific module's tests
nx run empi-svc:serve                    # Start one service
nx run web:serve                         # Start frontend dev server
```

**CI parity:** `make ci-local` runs `pnpm run ci:pr`, which chains `nx affected -t lint`, `typecheck`, `test`, and `test:integration` — the same sequence CI runs.

### 7.4 AI code review

Adapted from the reference project's 3-agent review system. The architecture review agent is configured with the HIMS module shape template and database principles as context, so it can detect violations (cross-module foreign keys, use-cases importing from data-access, missing tenant_id columns, direct DB imports in use-case files).

### 7.5 Load testing with k6

Load tests live at `tests/load/` as an Nx project. k6 scripts are JavaScript, organized by module and cross-module scenario.

```
tests/load/
├── scenarios/
│   ├── empi/
│   │   ├── search-patient.k6.js
│   │   └── register-patient.k6.js
│   └── cross-module/
│       └── opd-to-pharmacy.k6.js
├── lib/
│   ├── auth.js                    # Obtain JWT for k6 virtual users
│   ├── tenant.js                  # Tenant context setup
│   └── config.js                  # Base URL, thresholds, default options
├── thresholds.json                # Shared pass/fail thresholds
└── project.json                   # Nx: run, run-all targets
```

**When load tests run:**
- **NOT in PR pipeline.** Load tests take minutes, require infrastructure, and produce noisy results. They do not belong in the fast-feedback PR cycle.
- **Nightly CI.** A scheduled GitHub Actions workflow runs k6 against a deployed environment. Results export to Mimir/Prometheus via k6's built-in `--out experimental-prometheus-rw`, tagged with the commit hash.
- **On-demand locally.** Developers run `nx run load-tests:run -- --scenario=empi/search-patient.k6.js` against the local `docker-compose` stack.
- **Pre-release.** Before a production deployment, the full load test suite runs as a gate.

**k6 + LGTM integration:** k6 natively outputs Prometheus metrics — request duration histograms, error rates, throughput counters, custom thresholds. These flow into Mimir (the LGTM stack's metrics backend) and are visualized in Grafana dashboards alongside application metrics. A load test regression is visible in the same dashboard the team uses for production monitoring.

---

## 8. Adding a new module

The Nx generator (`tools/generators/module/`) scaffolds a new module with the correct structure. A developer adding a Pharmacy module runs:

```bash
nx generate @hims/tools:module pharmacy --language=typescript
```

This creates:

```
modules/pharmacy/
├── src/
│   ├── ports.ts                    # Empty port interfaces
│   ├── domain/
│   ├── use-cases/
│   ├── data-access/
│   ├── http-handlers/
│   ├── rest-handlers/
│   ├── events/
│   │   ├── publishers/
│   │   └── consumers/
│   ├── projections/
│   ├── schema/
│   │   └── tables.ts              # Boilerplate with tenant_id, audit columns
│   ├── router.ts
│   └── index.ts
├── test/
│   ├── unit/
│   ├── integration/
│   └── fixtures/
├── package.json                    # Depends on @hims/ts-sdk-* packages
├── tsconfig.json
└── project.json

services/pharmacy-svc/
├── src/
│   ├── main.ts                     # Boilerplate service wrapper
│   ├── adapters.ts
│   └── config.ts
├── package.json
└── project.json

specs/openapi/pharmacy.v1.yaml      # Skeleton OpenAPI spec
specs/events/pharmacy.events.yaml   # Skeleton event schema
```

The developer then:
1. Defines the API in `specs/openapi/pharmacy.v1.yaml`
2. Defines events in `specs/events/pharmacy.events.yaml`
3. Writes domain types in `domain/`
4. Writes port interfaces in `ports.ts`
5. Implements use-cases (one per file, imports ports)
6. Implements data-access (Drizzle repos implementing ports)
7. Implements handlers (validates input, calls use-case, returns response)
8. Writes tests (unit for use-cases, integration for data-access)

This sequence is the [outside-in development flow](../../hld/03-module-shape-template.md) from the reference project, adapted for spec-first contracts.

---

## 9. Dependency boundaries

Nx enforces dependency rules via project tags and `@nx/enforce-module-boundaries`:

| Source | May depend on | Must NOT depend on |
|--------|--------------|-------------------|
| `modules/*` | `packages/ts-sdk-*`, `packages/openapi-clients` | Other `modules/*`, `services/*` |
| `services/*` | `modules/*`, `packages/*` | Other `services/*` (except BFF → module services) |
| `packages/ts-sdk-*` | Other `packages/ts-sdk-*` (carefully) | `modules/*`, `services/*` |
| `packages/openapi-clients` | `specs/` (generated from) | `modules/*`, `services/*`, `packages/ts-sdk-*` |

**The critical rule:** A module must never import from another module. Cross-module communication is via events (async) or generated OpenAPI clients (sync). This enforces the [no cross-schema foreign keys](../../analysis/03-database-principles.md#4-no-cross-schema-foreign-keys) principle at the code level.

---

## 10. Technology choices summary

| Concern | Choice | Rationale |
|---------|--------|-----------|
| Monorepo orchestration | Nx | Polyglot project graph, affected detection, generators. [ADR-0016](../../adr/0016-polyglot-nx-monorepo-spec-first-contracts.md) |
| Package manager | pnpm | Strict dependency resolution, workspace protocol, disk-efficient |
| Runtime (TS) | Node.js 24 LTS | Native fetch, stable AsyncLocalStorage, mature ESM. Management-approved. [ADR-0019](../../adr/0019-fastify-node24-lts.md) |
| HTTP framework (TS) | Fastify v5 | JSON Schema validation (Ajv), encapsulated plugins, TypeBox type providers, ~2-3x Express throughput. [ADR-0019](../../adr/0019-fastify-node24-lts.md) |
| Route validation (TS) | TypeBox | JSON Schema at runtime + TypeScript types at compile time. Drives Fastify validation, serialization, and OpenAPI docs from one schema object. |
| ORM (TS) | Drizzle | TypeScript-native, SQL-transparent, migration generation. [ADR-0013](../../adr/0013-single-database-engine-postgresql.md) |
| Database | PostgreSQL + Citus | [ADR-0013](../../adr/0013-single-database-engine-postgresql.md), [database principles](../../analysis/03-database-principles.md) |
| API contracts | OpenAPI 3.1 (spec-first) | Polyglot support, generated clients, independent reviewability. [ADR-0016](../../adr/0016-polyglot-nx-monorepo-spec-first-contracts.md) |
| Event bus (Phase 0) | InProcessEventBus | Synchronous in-process dispatch, envelope validation, zero infrastructure overhead. [ADR-0017](../../adr/0017-in-process-event-bus-phase-0.md) |
| Event schemas | JSON Schema | Language-agnostic, validator support in every language |
| Authorization | Cerbos PDP sidecar | [ADR-0004](../../adr/0004-authz-cerbos-sidecar.md) |
| Authentication | better-auth + identity adapter | [ADR-0003](../../adr/0003-authn-better-auth-identity-adapter.md) |
| Frontend routing | TanStack Router v1 | Type-safe search params (Zod), file-based routing, first-class React Query integration. [ADR-0018](../../adr/0018-frontend-stack-zustand-tanstack-router.md) |
| Frontend client state | Zustand | Selector-based subscriptions (no unnecessary re-renders), outside-React access, ~1.1 kB. [ADR-0018](../../adr/0018-frontend-stack-zustand-tanstack-router.md) |
| Frontend server state | TanStack Query v5 | `useSuspenseQuery`, `queryOptions()`, query key factories. [ADR-0018](../../adr/0018-frontend-stack-zustand-tanstack-router.md) |
| Frontend data tables | TanStack Table v8 | Headless — sorting, filtering, pagination, column management. Industry standard. |
| Frontend virtualization | TanStack Virtual v3 | Large lists (ICD-10, SNOMED, patient lists, audit logs). Pairs with TanStack Table. |
| Frontend forms | React Hook Form v7 | Uncontrolled (ref-based), near-zero re-renders, Zod validation via `@hookform/resolvers` |
| Frontend auth/authz | @cerbos/react + @cerbos/http | Per-component permission checks, PlanResources permission map. [ADR-0018](../../adr/0018-frontend-stack-zustand-tanstack-router.md) |
| Design system | @pulse/* (IQSandbox) | UI components, blocks, patterns, layouts. Consumed as-is. |
| Build (frontend) | Vite 7.x | Fast HMR, TanStack Router file-based routing plugin, Tailwind v4 plugin |
| Testing (TS) | Vitest | Fast, Vite-native, ESM-first, compatible with the monorepo |
| Testing (Python) | pytest | Standard, well-supported |
| Load testing | k6 | JavaScript scripts, native Prometheus/Mimir output for LGTM stack, nightly CI |
| Linting (TS) | ESLint + sonarjs + security | Complexity analysis, security patterns |
| Python packaging | uv (by Astral) | Fast dependency resolution, lockfile support, replaces pip/poetry/pipenv. Same team as ruff — single toolchain for Python lint + deps |
| Linting (Python) | ruff | Fast, comprehensive, replaces flake8 + isort + pyflakes |
| Security scanning | Semgrep | Language-agnostic, no SaaS dependency |
| E2E testing | Playwright | Cross-browser, reliable, used in reference project |
| CI | GitHub Actions + Nx affected | Affected-only runs, local parity |
| Containerization | Docker multi-stage | One Dockerfile template for TS modules |
| Connection pooling | PgBouncer (transaction mode) | [Database principles §13](../../analysis/03-database-principles.md#13-postgresql-production-tuning) |

---

## 11. Open decisions

These decisions are deferred to early implementation:

| Decision | Options | When to decide |
|----------|---------|---------------|
| Event bus technology | Kafka vs NATS vs RabbitMQ | When cross-module event volume justifies a broker. Phase 0 uses InProcessEventBus ([ADR-0017](../../adr/0017-in-process-event-bus-phase-0.md)). |
| OpenAPI client generator | `openapi-typescript` + `openapi-fetch` vs `orval` vs `openapi-generator` | First spec → client generation |
| Nx plugin strategy | Inferred targets vs explicit `project.json` | First module scaffold |
| Spec validation tooling | `openapi-diff` vs custom route checker vs `prism` | First CI pipeline setup |
| Pulse consumption mechanism | pnpm workspace link vs local path vs npm pack from IQSandbox | First sprint |
| BFF framework | Fastify (same as modules) vs Hono (lighter, proxy-optimized) | BFF implementation |
