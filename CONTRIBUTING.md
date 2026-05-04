# Contributing to HIMS Platform

## Prerequisites

- Node.js 24+ (`node --version`)
- pnpm 10+ (`pnpm --version`)
- Docker (only needed for backend work)

## Frontend development (quickest path)

```bash
pnpm install
make dev-web          # or: cd services/web && pnpm dev
```

Open http://localhost:5173. Click "Dev Login" to bypass auth with mock data.

No Docker, no database, no backend needed. The mock login populates auth, tenant, and permission stores so all UI routes work.

## Full stack development

```bash
make setup            # installs deps, starts Docker (Citus, PgBouncer, Cerbos), runs migrations
make dev              # starts all services
```

## Key commands

| Command | What it does |
|---------|-------------|
| `make dev-web` | Frontend only |
| `make dev` | All services |
| `make dev-module m=empi-svc` | One backend service |
| `make test` | Run affected tests |
| `make ci-local` | Run full CI pipeline locally |
| `make graph` | Open Nx dependency graph |
| `make help` | Show all targets |

## Project structure

```
specs/          → OpenAPI + event contracts (write spec BEFORE code)
packages/       → Shared SDK packages (@hims/ts-sdk-*)
packages/pulse-*→ UI component library (from IQSandbox, adapted for TanStack Router)
modules/        → Business logic libraries (no deployment opinion)
services/       → Deployment wrappers (Fastify backend, Vite frontend)
infra/          → Docker, Cerbos policies, DB config
```

## Architecture docs (read before building)

1. [Monorepo Developer Guide](docs/architecture/lld/repo-structure/01-monorepo-setup.md) — where every file goes, module structure, layer rules
2. [Frontend Developer Guide](docs/architecture/lld/frontend/01-frontend-structure.md) — Zustand stores, TanStack Router patterns, permission system
3. [Module Shape Template](docs/architecture/hld/03-module-shape-template.md) — the contract every module follows
4. [Database Principles](docs/architecture/analysis/03-database-principles.md) — schema rules, Citus distribution, audit columns

## Conventions

- **Spec first.** Write or update `specs/openapi/<module>.v1.yaml` before handler code.
- **No cross-module imports.** `modules/*` cannot import from other `modules/*`. Use events (async) or generated OpenAPI clients (sync).
- **No cross-schema foreign keys.** Each module owns its own DB schema. Cross-module data flows through events or API calls.
- **`tenant_id` on every table.** Citus-distributed. No exceptions. See [database principles](docs/architecture/analysis/03-database-principles.md).
- **One use-case per file.** Use-cases are functions. Data-access adapters are classes. The layer decides — see [paradigm rules](docs/architecture/lld/repo-structure/01-monorepo-setup.md).
- **Rich event payloads.** Events carry all fields consumers might project — not just IDs.
- **Zustand selectors always.** `useStore(s => s.field)`, never `useStore()` bare.
- **Frontend auth is UX, not security.** Backend Cerbos PDP is the authority.

## Backend: how a module is built

Every backend module follows the same layered structure. Read the [Module Shape Template](docs/architecture/hld/03-module-shape-template.md) before writing any module code.

```
modules/<name>/src/
  ports.ts              ← Repository interfaces (the contracts)
  domain/               ← Types, value objects, entities with lifecycle
  use-cases/            ← One function per file, deps injected as params
  data-access/          ← Drizzle repos implementing ports (classes)
  http-handlers/        ← Intent-based handlers: register-patient.handler.ts
  rest-handlers/        ← RESTful CRUD: patients.handler.ts
  events/publishers/    ← Emit domain events after use-case completion
  events/consumers/     ← Handle events from other modules
  schema/               ← Drizzle table definitions + migrations
  router.ts             ← Mounts all handlers as a Fastify plugin
  index.ts              ← Public API: exports router, types, event handlers
```

The service wrapper (`services/<name>-svc/`) is a thin Fastify entry point that imports the module, wires concrete adapters (Drizzle repos, event bus), and starts the server. Module code has zero dependency on Fastify, PostgreSQL, or any infrastructure — it only depends on port interfaces.

### Backend workflow

1. Define the API in `specs/openapi/<module>.v1.yaml`
2. Define events in `specs/events/<module>.events.yaml`
3. Write domain types in `domain/`
4. Write port interfaces in `ports.ts`
5. Implement use-cases (one per file, imports ports — never data-access directly)
6. Implement data-access (Drizzle repos implementing ports)
7. Implement handlers (validate input, call use-case, return response)
8. Write tests: unit for use-cases (mocked ports), integration for data-access (real DB)

### Key backend patterns

**Use-case (function — stateless):**
```typescript
export function createRegisterPatient(deps: { patientRepo: PatientRepo; eventPublisher: EventPublisher }) {
  return async (input: RegisterPatientInput) => {
    // business logic here — no SQL, no HTTP, no framework code
  };
}
```

**Data-access (class — stateful, implements port):**
```typescript
export class DrizzlePatientRepo implements PatientRepo {
  constructor(private readonly db: DrizzleDB) {}
  // SQL lives here, business rules do not
}
```

**Service wrapper (composition root):**
```typescript
const patientRepo = new DrizzlePatientRepo(db);            // OOP: class
const registerPatient = createRegisterPatient({ patientRepo }); // FP: function
await app.register(createRouter({ registerPatient }), { prefix: '/empi' });
```

## Frontend: adding a new feature

1. Create route file in `services/web/src/routes/_authenticated/<module>/`
2. Create feature dir in `services/web/src/features/<module>/`
3. Add query key factory in `features/<module>/api/keys.ts`
4. Add queries/mutations in `features/<module>/api/`
5. Gate the route with `beforeLoad` permission check
6. Use `useSuspenseQuery` with `queryOptions()` — not `useQuery`

See [Frontend LLD §8](docs/architecture/lld/frontend/01-frontend-structure.md) for the full pattern.

### Pulse UI components

`@pulse/ui`, `@pulse/blocks`, `@pulse/layouts` etc. are in `packages/pulse-*`. These are the design system components. Import like:

```typescript
import { Button } from '@pulse/ui/button';
import { AppShell } from '@pulse/layouts/app-shell';
import { DataTable } from '@pulse/blocks/data-table';
```

## Further reading

| Topic | Document |
|-------|----------|
| Full architecture overview | [System Overview](docs/architecture/hld/01-system-overview.md) |
| Auth flow (authn + authz) | [AuthN/AuthZ Flow](docs/architecture/hld/04-authn-authz-flow.md) |
| Module build order & phasing | [Module Build Order](docs/architecture/analysis/02-module-build-order.md) |
| All ADRs (decisions + rationale) | [ADR Index](docs/architecture/adr/README.md) |
| Task breakdown for implementation | [Task Breakdown](docs/architecture/lld/implementation/01-task-breakdown.md) |
