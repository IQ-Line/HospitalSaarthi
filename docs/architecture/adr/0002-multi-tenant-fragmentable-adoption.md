# ADR-0002: Multi-tenant, fragmentable adoption

- **Status:** Proposed
- **Date:** 2026-04-28
- **Deciders:** [Engineering Manager], [Architect]

## Context and problem statement

The HIMS platform targets the full AIIMS EOI scope (~38 functional areas) but must also serve hospitals that adopt only one or two modules alongside an existing legacy HIS. A single-pharmacy chemist may run only the Pharmacy module; AIIMS New Delhi runs all ~38. This "fragmented adoption" constraint is the single most consequential shape decision: it determines how modules are bounded, how they communicate, and what constitutes the minimum viable deployment. See [HLD 01 -- System Overview, section 2.3](../hld/01-system-overview.md#23-the-central-constraint-fragmented-adoption) and [section 3 (Shape constraints)](../hld/01-system-overview.md#3-shape-constraints).

## Decision drivers

- Hospitals must be able to adopt individual modules piecemeal without deploying the full platform ([HLD 01 section 2.3](../hld/01-system-overview.md#23-the-central-constraint-fragmented-adoption)).
- Adopted modules must interoperate with both sibling platform modules and external legacy systems using the same protocol boundaries ([HLD 01 section 3.1](../hld/01-system-overview.md#31-standards-based-interop-at-clinical-boundaries)).
- The Indian public-health market ranges from 10-bed clinics to 2,400-bed tertiary-care institutions; the platform cannot require a uniform deployment footprint ([HLD 01 section 8](../hld/01-system-overview.md#8-deployment-topologies-summary)).
- Multi-tenant SaaS deployment must coexist with single-tenant on-premises deployment using the same codebase ([HLD 01 sections 8.1--8.4](../hld/01-system-overview.md#8-deployment-topologies-summary)).
- Per-module data ownership is mandatory -- no cross-module foreign keys -- so modules can be independently replaced or omitted ([HLD 01 section 3.2](../hld/01-system-overview.md#32-per-module-data-ownership)).

## Considered options

1. **Monolithic platform -- all-or-nothing deployment** -- a single deployable artifact containing all functional areas; hospitals deploy the entire platform or nothing.
2. **Fragmentable modular platform with standards-based boundaries** -- each module is an independently deployable unit with FHIR/HL7 interop boundaries, per-module data ownership, and event-driven communication; the platform supports any subset of modules.
3. **Plugin architecture with shared runtime** -- a shared application runtime that loads feature modules as plugins via a defined plugin API; modules share the runtime's data layer and process.

## Decision outcome

Chosen option: **Fragmentable modular platform with standards-based boundaries**, because it is the only approach that allows a hospital to deploy an arbitrary subset of modules alongside legacy systems while preserving the ability to scale to the full AIIMS EOI scope. Standards-based boundaries (FHIR R4, HL7v2) mean the same integration contract works whether the counterpart is a sibling platform module or a third-party legacy system.

### Consequences

**Positive:**

- A hospital can adopt a single module (e.g., Pharmacy) with only the core platform dependencies (User Management, Configurator, Master Data, and EMPI if patient-facing), reducing the barrier to entry and commercial friction.
- The same module codebase supports four deployment topologies -- full on-prem, full SaaS, fragmented, and lite -- because modules are libraries with injected adapters, not topology-aware applications ([HLD 01 section 8](../hld/01-system-overview.md#8-deployment-topologies-summary)).
- Standards-based interoperability (FHIR R4, HL7v2) at clinical module boundaries means the platform's integration contracts are reusable for both internal and external communication, eliminating a class of bespoke adapters.
- Per-module data ownership makes modules independently replaceable. If a hospital later switches from a legacy Lab system to the platform's Lab module, no other platform module's data model changes.

**Negative / accepted trade-offs:**

- Operational complexity increases: each module is a separate deployment unit with its own database, Cerbos PDP sidecar, health checks, and scaling policies. For a full-platform deployment with 20+ active modules, the Kubernetes footprint is non-trivial.
- Eventual consistency across modules is the default. Modules communicate via events; a patient registered in OPD is visible in Lab only after the event propagates. Clinical workflows that require immediate cross-module consistency must use synchronous API calls with explicit fallback handling.
- Each module must implement the full compliance contract (PEP middleware, identity adapter, tenant scoping, event publication) described in the [module shape template](../hld/03-module-shape-template.md). This is a per-module implementation tax that a monolith would avoid.

**Follow-up actions:**

- [ ] Finalize the module shape template ([HLD 03](../hld/03-module-shape-template.md)) as the enforceable contract for module compliance.
- [ ] Define the minimum-viable deployment footprint for fragmented adoptions (core modules + one feature module).
- [ ] Produce ADR-0009 (event-driven inter-module communication) to specify the event bus contract that makes fragmented adoption possible.
- [ ] Produce ADR-0010 (FHIR/HL7 as interop standards) to lock the clinical boundary contract.

## Pros and cons of the options

### Monolithic platform -- all-or-nothing deployment

- *Good:* Simplest operational model -- one artifact, one database, one deployment pipeline.
- *Good:* No inter-module network calls; all function calls are in-process with transactional consistency.
- *Good:* Lower initial development cost -- no adapter layer, no event bus, no per-module PEP.
- *Bad:* Hospitals that need only one or two modules must deploy and operate the entire platform, paying for infrastructure, licensing, and complexity they do not use. This is a dealbreaker for the Indian market where most hospitals are small.
- *Bad:* Cannot interoperate with legacy systems at module granularity. The monolith is either the HIS or it is not; there is no partial adoption path.
- *Bad:* Scaling is all-or-nothing. If the Lab module needs more compute, the entire monolith scales, including modules with no load pressure.
- *Bad:* Contradicts the core commercial thesis: selling individual modules to hospitals that already have partial legacy coverage.

### Fragmentable modular platform with standards-based boundaries

- *Good:* Directly supports the central adoption constraint -- any subset of modules is a valid deployment.
- *Good:* Standards-based boundaries (FHIR R4, HL7v2) make the interoperability contract reusable for both platform-internal and legacy-external communication.
- *Good:* Per-module data ownership enables independent deployment, independent scaling, and independent replacement.
- *Good:* The library-first module design supports multiple deployment topologies (service mode, embedded mode) from one codebase.
- *Bad:* Higher operational complexity -- many deployable units, distributed tracing, eventual consistency by default.
- *Bad:* Per-module compliance contract (PEP, identity adapter, tenant scoping, events) is an implementation tax on every module team.
- *Bad:* FHIR mapping is non-trivial; module teams must maintain mappings between internal models and FHIR resources.

### Plugin architecture with shared runtime

- *Good:* Simpler than full service decomposition -- plugins share the runtime's infrastructure (auth, data layer, event dispatch).
- *Good:* Plugins can be loaded or unloaded per tenant, supporting some degree of fragmented adoption.
- *Good:* In-process communication between plugins avoids network overhead.
- *Bad:* Plugin isolation is weaker than service isolation. A misbehaving plugin (memory leak, CPU spin) affects the entire runtime and all co-hosted plugins. No independent scaling per plugin.
- *Bad:* Shared data layer undermines per-module data ownership. Cross-plugin foreign keys become tempting and, once introduced, make plugins inseparable.
- *Bad:* Does not solve the legacy interop problem. The plugin boundary is a runtime API, not a standards-based protocol. Communicating with an external legacy system requires a separate integration layer that the plugin model does not inherently provide.
- *Bad:* Plugin API becomes a compatibility surface that the platform team must maintain indefinitely. Breaking changes to the plugin API require coordinated updates across all plugins.

## Links

- Related ADRs: [ADR-0001](./0001-record-architecture-decisions.md), [ADR-0006](./0006-four-core-platform-modules.md), [ADR-0012](./0012-multi-tenancy-isolation-strategy.md)
- Related HLD: [System Overview -- fragmented adoption](../hld/01-system-overview.md#23-the-central-constraint-fragmented-adoption), [System Overview -- shape constraints](../hld/01-system-overview.md#3-shape-constraints), [System Overview -- deployment topologies](../hld/01-system-overview.md#8-deployment-topologies-summary), [Module Shape Template](../hld/03-module-shape-template.md)
- External sources:
  - Microsoft, "Tenancy models for a multitenant solution", https://learn.microsoft.com/en-us/azure/architecture/guide/multitenant/considerations/tenancy-models, accessed 2026-04-28
  - Sam Newman, *Building Microservices*, 2nd ed., O'Reilly, 2021, ch. 1--2 (on service boundaries, independent deployability, and the cost of decomposition)
