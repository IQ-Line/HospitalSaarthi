# ADR-0008: Module shape and boundaries

- **Status:** Proposed
- **Date:** 2026-04-28
- **Deciders:** [Engineering Manager], [Architect]

## Context and problem statement

The HIMS platform must support approximately 38 functional areas from the AIIMS EOI scope, deployed across a wide spectrum of environments: full Kubernetes clusters for large hospitals, fragmented deployments where a hospital adopts one module alongside a legacy HIS, and lite single-process deployments for small clinics or standalone pharmacies. The architecture needs a module shape that enables independent development and deployment of each module while allowing multiple packaging modes from the same codebase. See [HLD 01 -- System Overview, section 2.3](../hld/01-system-overview.md#23-the-central-constraint-fragmented-adoption) and [HLD 03 -- Module Shape Template, section 1](../hld/03-module-shape-template.md#1-module-anatomy-overview).

## Decision drivers

- **Fragmented adoption** -- hospitals must adopt individual modules alongside legacy systems without requiring a full platform deployment ([HLD 01 section 2.3](../hld/01-system-overview.md#23-the-central-constraint-fragmented-adoption)).
- **Deployment spectrum** -- the same module code must run as an independent Kubernetes pod (service mode) or as a library within a shared process (embedded mode) ([HLD 03 section 1.1](../hld/03-module-shape-template.md#11-library-first-design)).
- **Module != EOI line item** -- a deployment unit may implement multiple functional areas that share data models, workflow coupling, or scaling characteristics. Each grouping must be justified by operational affinity, not by the procurement document's line numbering ([HLD 03 preamble](../hld/03-module-shape-template.md)).
- **Independent data ownership** -- modules must own their schemas exclusively, with no cross-module foreign keys, to enable independent deployment and replacement ([HLD 03 section 5](../hld/03-module-shape-template.md#5-data-ownership)).
- **EM position** -- "modules must justify being separate services." Not every EOI line item deserves its own pod; the overhead of a separate service must be earned by distinct scaling characteristics, independent failure domains, or separate team ownership.

## Considered options

1. **Monolithic shared codebase with package boundaries** -- all modules in a single deployable unit, separated by language-level package boundaries (namespaces, modules) but sharing a single process, single database, and single deployment pipeline.
2. **Library-first modules with Ports & Adapters (service + embedded modes)** -- modules implemented as self-contained libraries with cross-cutting concerns injected through adapters. In service mode, each module deploys as its own Kubernetes pod with a Cerbos PDP sidecar. In embedded mode, multiple module libraries run in a single process with in-process event dispatch and a shared Cerbos PDP. Both modes use the same business logic code.
3. **Microservices-only (every module is always a separate service)** -- each module is always an independently deployed service with its own process, database, and event-bus connection. No embedded or shared-process mode.

## Decision outcome

Chosen option: **Library-first modules with Ports & Adapters (service + embedded modes)**, because it is the only option that spans the full deployment spectrum -- from a single-process lite deployment for a standalone pharmacy to a full Kubernetes deployment for AIIMS -- while keeping module business logic identical across all modes. Pure microservices cannot economically serve small tenants (a 15-pod cluster for a single pharmacy is operationally absurd), and a monolith cannot serve fragmented adoption (a hospital cannot adopt "just the Pharmacy package" from a monolith without deploying the entire codebase).

### Consequences

**Positive:**

- A single codebase per module eliminates the divergence risk of maintaining separate "lite" and "full" implementations. The adapter pattern means switching between in-process and network-based event dispatch, identity verification, and authorization is a configuration decision, not a code change.
- Fragmented adoption works naturally: a hospital running only the Pharmacy module deploys the Pharmacy library in service mode alongside the core modules, connected to their legacy HIS via the Integration Hub. The Pharmacy module does not carry dead code for modules the hospital has not adopted.
- The EM's directive -- "modules must justify being separate services" -- is structurally enforced. Multiple functional areas (e.g., OPD + Appointment Scheduling + Queue Management) can be grouped into a single deployment unit when they share data models and workflow coupling, reducing operational overhead without sacrificing internal separation of concerns at the library level.

**Negative / accepted trade-offs:**

- The adapter abstraction adds indirection. Developers must understand the Ports & Adapters pattern and write code against adapter interfaces rather than directly against infrastructure. This requires training and consistent code review, especially for teams new to hexagonal architecture.
- Embedded mode is not a free lunch. It requires in-process implementations of the event bus, identity adapter, and Cerbos client. These must be built and maintained alongside the network-based implementations. The cost is justified by the deployment flexibility it provides, but it is real engineering work.
- Schema-per-module with no cross-module foreign keys means some queries that would be trivial joins in a shared database require event-driven projections and eventual consistency. Module teams must design for this from the start.

**Follow-up actions:**

- [ ] Define the platform SDK surface: shared PEP middleware, identity adapter interface, event-bus adapter interface, Configurator client, and module bootstrap harness.
- [ ] Establish criteria for when functional areas should be grouped into a single deployment unit vs. separated (data model overlap, workflow coupling, scaling profile, team ownership).
- [ ] Build the embedded-mode adapter implementations (in-process event dispatcher, shared Cerbos PDP client) as a second-phase effort after service-mode adapters are stable.

## Pros and cons of the options

### Monolithic shared codebase with package boundaries

- *Good:* Simplest deployment model -- one artifact, one database, one deployment pipeline. No distributed systems complexity for the initial build.
- *Good:* Cross-module queries are trivial SQL joins. No projection syncing or eventual consistency to manage.
- *Bad:* Cannot serve fragmented adoption. A hospital cannot deploy "just the Pharmacy" from a monolith without deploying the entire application, including modules it does not use and has not licensed.
- *Bad:* Package boundaries are enforced by convention, not by infrastructure. Over time, developers take shortcuts and introduce cross-package dependencies that erode modularity. Without hard boundaries (separate databases, separate processes), the monolith becomes a distributed monolith in reverse -- tightly coupled internally with no path to independent deployment.
- *Bad:* Scaling is all-or-nothing. A spike in lab result processing forces scaling the entire application, including modules that are idle.

### Library-first modules with Ports & Adapters (service + embedded modes)

- *Good:* Spans the full deployment spectrum from single-process to full Kubernetes, addressing both AIIMS-scale and small-clinic-scale deployments from the same codebase.
- *Good:* Hard data-ownership boundaries (schema-per-module, no cross-module FK) enforced by infrastructure, not convention. Module independence is structural.
- *Good:* The Hexagonal Architecture pattern is well-understood, well-documented, and well-suited to systems that must support multiple deployment contexts. It maps cleanly to the platform's need for swappable adapters (in-process vs. network event bus, local vs. sidecar Cerbos).
- *Bad:* Higher upfront complexity than a monolith. The adapter layer, platform SDK, and dual-mode deployment require deliberate design and investment.
- *Bad:* Eventual consistency for shared entities (patient projections, reference data caches) adds cognitive load for module developers.
- *Bad:* Two deployment modes means two sets of integration tests -- service-mode tests (network, sidecar) and embedded-mode tests (in-process, shared PDP).

### Microservices-only (every module is always a separate service)

- *Good:* Maximum independence per module. Each module has its own deployment lifecycle, its own scaling profile, and its own failure domain.
- *Good:* Hard boundaries by default -- separate processes, separate databases, separate deployment pipelines.
- *Bad:* Cannot serve small tenants. A standalone pharmacy deployment with 15+ pods (4 core modules, 1 feature module, BFF, Integration Hub, plus infrastructure) is operationally and financially disproportionate.
- *Bad:* Encourages premature decomposition. The EM's position -- modules must justify being separate services -- directly contradicts a microservices-only approach. Grouping OPD + Scheduling + Queue Management into one service is natural and reduces overhead; a microservices-only architecture makes this grouping an anti-pattern rather than a design choice.
- *Bad:* Distributed systems complexity is always-on, even for deployments that do not need it. Every module-to-module interaction is a network call with failure modes (timeouts, retries, circuit breakers) that do not exist in an in-process call.

## Links

- Related ADRs: [ADR-0001](./0001-record-architecture-decisions.md), [ADR-0002](./0002-multi-tenant-fragmentable-adoption.md), [ADR-0009](./0009-event-driven-inter-module-communication.md)
- Related HLD: [Module Shape Template -- section 1](../hld/03-module-shape-template.md#1-module-anatomy-overview), [System Overview -- section 2.3](../hld/01-system-overview.md#23-the-central-constraint-fragmented-adoption), [System Overview -- section 3](../hld/01-system-overview.md#3-shape-constraints)
- External sources:
  - Sam Newman, *Building Microservices*, 2nd edition (O'Reilly, 2021), chapters 1--3 -- the modular monolith to microservices spectrum and when decomposition is justified
  - Alistair Cockburn, "Hexagonal Architecture (Ports and Adapters)", https://alistair.cockburn.us/hexagonal-architecture/, accessed 2026-04-28
