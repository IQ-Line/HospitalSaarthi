# ADR-0016: Polyglot Nx monorepo with spec-first OpenAPI contracts

- **Status:** Proposed
- **Date:** 2026-05-03
- **Deciders:** [Architect], [Engineering Manager], [Tech Lead]

## Context and problem statement

The platform is transitioning from architecture documentation to code. Before any module is built, the team needs a repository structure that supports:

1. **Multiple programming languages.** The core modules are TypeScript, but specialized modules (AI/ML services, high-throughput gateways) may be Python, Go, or other languages. The repo structure must not assume a single-language ecosystem.
2. **Independent module deployment.** Modules must be deployable as standalone services, bundled into a single process (embedded mode for small clinics), or have their business logic run in the browser (offline mode). This requires strict separation of module libraries from deployment wrappers.
3. **Type-safe inter-module communication.** Modules communicate via HTTP APIs and asynchronous events. The API contract must be enforceable across languages — a TypeScript module calling a Python module must get type-safe clients without importing Python code.
4. **7-person team with varied experience.** Most developers know MongoDB/Express from the production HIMS. The tooling must be learnable without deep expertise in monorepo infrastructure.
5. **CI that scales with the codebase.** As modules multiply, CI must run only affected checks (lint, test, typecheck) to keep pipeline times reasonable.

## Decision drivers

- **Polyglot support is a hard requirement.** Team discussions confirmed that Python services are expected (ML/AI), and the architecture must not foreclose other languages. This eliminates tooling that assumes a single package manager ecosystem.
- **Offline support for critical clinical workflows.** A solution architect identified that limited offline continuity (emergency registration, patient lookup, encounter creation) is an eventual requirement. This demands that module business logic be portable — runnable in Node.js, in the browser, or in a local server — which requires strict library-first design with injected data-access adapters.
- **Deployment flexibility is an architectural constraint.** The [fragmented adoption model](../hld/01-system-overview.md) means modules deploy in different topologies per hospital. A module's code must not encode its deployment mode.
- **Inter-module contracts must be language-agnostic.** TypeScript Zod schemas (the toy-poc-sdlc-demo's approach) are excellent for single-language projects but cannot serve as contracts for Python or Go consumers. A language-neutral contract format is required.
- **Affected-only CI is essential at scale.** With 4 core modules, a BFF, a frontend, 6+ SDK packages, and eventual feature modules, running all checks on every PR is not sustainable. The build tool must understand the dependency graph and run only what changed.

## Considered options

### Option 1: Nx monorepo (polyglot)

Nx manages the project graph, task orchestration, caching, and affected detection. Each project (module, service, package) is an Nx project with defined targets. Nx supports non-JavaScript projects via custom executors and `project.json` configurations — a Python module declares `lint`, `test`, and `build` targets that run `ruff`, `pytest`, and `docker build` respectively.

OpenAPI specs live in a centralized `specs/` directory as the language-agnostic contract layer. Typed clients are generated from specs into a shared `packages/openapi-clients/` package. Event schemas use JSON Schema, also centralized.

### Option 2: Turborepo + pnpm workspaces

Turborepo provides content-hash-based caching, parallel execution, and affected filtering via `--filter`. Configuration is a single `turbo.json`. Lighter than Nx — fewer concepts, no plugins, no project graph inference.

### Option 3: pnpm workspaces + custom scripts

No build orchestrator. The team writes shell scripts for CI ordering, caching (if any), and affected detection. Each package has npm scripts that CI invokes directly.

## Decision outcome

**Chosen option: Option 1 (Nx monorepo)** with spec-first OpenAPI contracts and library-first module design.

### Why not Turborepo (Option 2)

Turborepo is excellent for JavaScript/TypeScript monorepos. Its limitation surfaces with polyglot projects: Turborepo operates on the `package.json` workspace graph. A Python project without a `package.json` requires a shim `package.json` to participate in the workspace, and its dependency relationships to TypeScript packages are invisible to Turbo's content-hash graph. Nx's explicit project graph (`project.json` or inferred) handles cross-language dependencies natively — a change to `specs/empi.v1.yaml` triggers rebuilds of both the TypeScript `openapi-clients` package and any Python module that consumes that spec.

Turborepo would be the right choice for a TypeScript-only monorepo. The polyglot requirement tips the balance to Nx.

### Why not plain pnpm workspaces (Option 3)

No affected detection, no caching, no parallelization. CI times grow linearly with the number of packages. For a team of 7 building 10+ packages, this creates friction within months. The team's time is better spent on module code than on maintaining build infrastructure.

### Consequences

**Positive:**

- **One repo, one PR, one CI run.** A change that spans a spec, an SDK package, and a module is a single atomic PR. No cross-repo coordination.
- **Affected-only CI.** Nx computes the project graph and runs targets only for affected projects. A change to `modules/empi/` does not trigger tests for `modules/configurator/`.
- **Polyglot project graph.** Nx tracks dependencies between TypeScript packages, Python projects, and spec files. A spec change propagates to all consuming projects regardless of language.
- **Generators for consistency.** An Nx generator scaffolds new modules with the correct internal structure (onion layers, Drizzle schema boilerplate, SDK wiring, test setup). This is the [module shape template](../hld/03-module-shape-template.md) made executable.
- **Local and CI parity.** Developers run `nx affected -t test` locally — the same command CI runs. No "works on my machine" divergence.

**Negative / accepted trade-offs:**

- **Nx learning curve.** Most of the team has no Nx experience. Mitigation: the generator handles project setup; developers interact with Nx primarily through `nx run <project>:<target>` and `nx affected`. The project graph and plugin system are maintained by the leads.
- **Configuration surface area.** Nx requires `nx.json` at the root and `project.json` per project (or inferred targets from `package.json`). This is more configuration than Turborepo's single `turbo.json`. Mitigation: the generator produces correct `project.json` files; developers rarely edit them.
- **Nx versioning and upgrades.** Nx releases frequently and major upgrades can require migration. Mitigation: pin Nx version, upgrade deliberately, use `nx migrate` tooling.

---

## Spec-first OpenAPI contracts

### Decision

Inter-module API contracts are defined as OpenAPI 3.1 YAML specs in a centralized `specs/openapi/` directory. Event payload schemas are defined as JSON Schema in `specs/events/`. These are the source of truth for all inter-module communication.

### Why spec-first (not code-first)

**Code-first** (generating OpenAPI from code annotations or Zod schemas) works well in single-language projects — the toy-poc-sdlc-demo uses Zod schemas as the shared contract. In a polyglot monorepo, code-first breaks: a TypeScript Zod schema cannot be consumed by a Python service. The contract must be language-neutral.

**Spec-first** means the YAML spec is written first, reviewed independently, and then code is generated or validated against it:

- TypeScript modules get typed clients via `openapi-typescript` + `openapi-fetch`, generated into `packages/openapi-clients/`.
- Python modules get typed clients via `openapi-generator` for Python.
- CI validates that each module's implementation matches its spec (route coverage, request/response shapes).
- Spec changes are visible in PR diffs as YAML changes in `specs/`, separate from implementation changes — reviewers can evaluate the contract independently.

### Event schemas

Asynchronous event payloads follow the same principle: JSON Schema definitions in `specs/events/`, with the standard event envelope defined in `specs/events/_envelope.schema.json`. TypeScript types are generated from these schemas. The event SDK validates payloads against the schema at publish time (in development/test; optionally in production).

---

## Library-first module design

### Decision

Every module is implemented as a **library** — a package that exports business logic, data-access interfaces, HTTP handlers, and event consumers. A module has no opinion about its deployment mode. Deployment wrappers in `services/` import module libraries and wire them to concrete adapters (Drizzle → PostgreSQL, event bus → Kafka/NATS, HTTP server → Express/Hono).

### Why separate modules from services

The [module shape template](../hld/03-module-shape-template.md) defines three deployment modes: service mode (one module per pod), embedded mode (multiple modules in one process), and — identified during LLD — offline mode (business logic running in the browser with local storage). If the module's code contains a `main.ts` that starts an HTTP server and connects to PostgreSQL, it cannot run in the browser. If the module's use-cases import Drizzle directly, they cannot be swapped to IndexedDB for offline support.

The separation is:

```
modules/empi/                    ← Pure library. Exports router, use-cases, event handlers.
                                    Data-access behind port interfaces.
                                    No main.ts, no server startup, no direct DB connection.

services/empi-svc/               ← Deployment wrapper. ~30 lines.
                                    Imports module, wires Drizzle adapter, starts HTTP server,
                                    connects event bus, runs health checks.
```

This costs ~30 lines of boilerplate per deployable module. The return is: the same module code runs in a Kubernetes pod, in a combined embedded-mode process, or bundled into a frontend for offline critical workflows — without modification.

### Ports and adapters

Each module defines data-access interfaces (ports) that its use-cases depend on. The service wrapper injects concrete implementations (adapters):

- **Service mode:** Drizzle/PostgreSQL adapter, Kafka/NATS event adapter, Cerbos gRPC adapter.
- **Embedded mode:** Same adapters, but the host process manages shared connections.
- **Offline mode (future):** IndexedDB adapter, local event queue, offline Cerbos policy cache.

This is the Hexagonal Architecture pattern applied at the module level, consistent with the toy-poc-sdlc-demo's approach and the [module shape template](../hld/03-module-shape-template.md) §1.1.

---

## Follow-up actions

- [ ] Create the monorepo repository with the directory structure defined in the [Repo Structure LLD](../lld/repo-structure/01-monorepo-setup.md).
- [ ] Build the Nx generator that scaffolds new modules with correct internal structure.
- [ ] Write the first OpenAPI spec (User Management) and validate the spec → generated client → module consumption pipeline.
- [ ] Establish CI pipeline with affected-only Nx targets.

## Links

- Related ADRs: [ADR-0008](./0008-module-shape-and-boundaries.md) (module shape), [ADR-0013](./0013-single-database-engine-postgresql.md) (PostgreSQL-only)
- Related HLD: [Module Shape Template](../hld/03-module-shape-template.md), [System Overview](../hld/01-system-overview.md)
- Related LLD: [Repo Structure — Monorepo Setup](../lld/repo-structure/01-monorepo-setup.md)
- Related analysis: [Module Build Order](../analysis/02-module-build-order.md), [Database Principles](../analysis/03-database-principles.md)
- Reference: toy-poc-sdlc-demo (internal) — Nx monorepo with vertical slice architecture, evaluated and adapted for HIMS requirements
