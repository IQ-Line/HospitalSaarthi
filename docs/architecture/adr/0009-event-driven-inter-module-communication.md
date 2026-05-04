# ADR-0009: Event-driven inter-module communication

- **Status:** Proposed
- **Date:** 2026-04-28
- **Deciders:** [Engineering Manager], [Architect]

## Context and problem statement

The HIMS platform consists of independently deployable modules that must exchange data -- patient events, clinical orders, inventory updates, billing triggers -- without creating runtime coupling. In a fragmented deployment, a module's sibling may not even be running (replaced by a legacy system connected via the Integration Hub). The inter-module communication model must support this decoupling while preserving data consistency for clinical workflows. See [HLD 03 -- Module Shape Template, sections 6--7](../hld/03-module-shape-template.md#6-event-publication) and [HLD 01 -- System Overview, section 3.3](../hld/01-system-overview.md#33-no-cross-module-synchronous-dependencies-by-default).

## Decision drivers

- **Temporal decoupling** -- modules must not require sibling modules to be running at the time of communication. In fragmented deployments, the "other side" of a communication channel may be a legacy system that is offline during maintenance windows or only processes messages in batch ([HLD 01 section 2.3](../hld/01-system-overview.md#23-the-central-constraint-fragmented-adoption)).
- **Independent deployability** -- upgrading or restarting one module must not break or block other modules. Synchronous call chains create deployment coupling: module A cannot be deployed if module B (which A calls synchronously) is mid-rollout ([HLD 03 section 7](../hld/03-module-shape-template.md#7-inter-module-communication-hierarchy)).
- **Natural audit trails** -- clinical workflows require a durable record of what happened, when, and in what order. Events are immutable records of state changes, providing an inherent audit trail without additional instrumentation ([HLD 03 section 6](../hld/03-module-shape-template.md#6-event-publication)).
- **Schema-per-module data ownership** -- with no cross-module foreign keys, shared entities (patients, reference data) must be projected into consuming modules. Events are the synchronization mechanism for these projections ([HLD 03 section 5](../hld/03-module-shape-template.md#5-data-ownership)).
- **Communication hierarchy is explicit** -- the platform defines a ranked preference: (1) async events, (2) FHIR R4 at clinical boundaries, (3) HL7v2 for legacy, (4) generic JSON as last resort. Synchronous inter-module HTTP calls are the documented exception, not the default ([HLD 03 section 7](../hld/03-module-shape-template.md#7-inter-module-communication-hierarchy)).

## Considered options

1. **Synchronous REST/gRPC between modules** -- modules communicate via direct HTTP or gRPC calls. Each module exposes a service API that other modules call synchronously.
2. **Event-driven async as default with sync as exception** -- asynchronous events are the primary inter-module communication mechanism. Modules publish domain events to an event bus; consuming modules subscribe. Synchronous calls are permitted as documented exceptions for cases where real-time response is required (e.g., EMPI dedup during registration).
3. **Shared database for inter-module data** -- modules share database tables for commonly referenced entities (patients, orders). Modules read and write to shared tables, using database-level constraints for consistency.

## Decision outcome

Chosen option: **Event-driven async as default with sync as exception**, because events decouple modules temporally, which is essential for fragmented adoption where a module's counterpart may not be running. Events also align with schema-per-module data ownership -- shared entities are projections synced via events, not shared tables. Synchronous calls remain available for the narrow set of interactions that genuinely require a real-time response, but they are the exception requiring explicit documentation, circuit breakers, and graceful degradation.

### Consequences

**Positive:**

- Modules can be deployed, upgraded, and scaled independently. Publishing a `prescription.created` event does not require the Pharmacy module to be running at that instant; the event is durable on the bus and processed when the Pharmacy module is ready.
- Fragmented adoption works naturally. When a legacy HIS occupies the OPD role, the Integration Hub translates HL7v2 ORM messages into the same `prescription.received` events that the Pharmacy module would consume from a platform OPD module. The Pharmacy module does not know or care whether the prescription came from a sibling module or a legacy system.
- The standard event envelope (event_id, event_type, source_module, iq_tenant_id, correlation_id, schema_version, payload) provides a uniform, tenant-scoped, traceable communication fabric across all modules without module-specific instrumentation.
- **Hybrid payload standard: FHIR R4 for clinical events, lean domain payloads for operational events.** Clinical events (`patient.created`, `lab.result.available`, `prescription.issued`) carry FHIR R4 resource payloads -- the event payload IS a FHIR resource (e.g., a `patient.created` event carries a FHIR Patient resource). This means that if the event ever needs to leave the platform (ABDM health record exchange, external hospital integration), it is already in the interoperable format -- no secondary serialization step. One serialization format for all clinical data flowing through the event bus. Operational and platform events (`config.changed`, `module.enabled`, `user.role.assigned`) carry lean, domain-specific payloads because FHIR does not model platform configuration or user management concerns. This hybrid approach also means that HL7v2 conversion happens only in the Integration Hub's inbound/outbound components, never in module code or event handlers -- modules work exclusively with FHIR resources for clinical data (see [ADR-0010](./0010-fhir-hl7-interop-standards.md) for the FHIR/HL7 interoperability standard).

**Negative / accepted trade-offs:**

- Eventual consistency is the default for shared entity projections. A patient record updated in EMPI will be reflected in the Pharmacy module's local projection after the event is delivered and processed -- typically sub-second, but not instantaneous. Module teams must design for this, and the narrow cases where absolute freshness is required must use the documented synchronous exception path.
- Debugging distributed event flows is harder than tracing synchronous call chains. The correlation_id in the event envelope mitigates this, but teams need distributed tracing tooling (linked to the correlation_id) and training on event-driven debugging patterns.
- Event schema evolution is a coordination cost. A change to the `patient.updated` event schema published by EMPI affects every consuming module. This is managed through schema versioning (the `schema_version` field in the envelope) and, when the event bus supports it, a schema registry. But it requires cross-team coordination that synchronous APIs (with versioned endpoints) handle differently.

**Follow-up actions:**

- [ ] Select the event bus technology (Kafka, NATS, RabbitMQ, or cloud-managed equivalent) in a dedicated ADR when cross-module event volume justifies the infrastructure. The module shape and event contract are bus-agnostic by design.
- [ ] Define the event schema governance process: who reviews event schema changes, how breaking changes are communicated, and whether a schema registry is required.
- [x] Build the event-bus adapter for both service mode and embedded mode — see [ADR-0017](./0017-in-process-event-bus-phase-0.md). Phase 0 uses `InProcessEventBus`; the broker-backed adapter is built when the bus technology is selected.
- [ ] Document the criteria for when a synchronous inter-module call is justified, including the required circuit-breaker and graceful-degradation patterns.
- [ ] Define the event payload standard: FHIR R4 resources for clinical events, lean domain payloads for operational events. Specify which event types carry FHIR payloads vs. domain-specific payloads, and document the mapping from event_type to expected payload schema (cross-ref [ADR-0010](./0010-fhir-hl7-interop-standards.md)).

## Pros and cons of the options

### Synchronous REST/gRPC between modules

- *Good:* Simple request-response model. Familiar to most developers. Easy to debug with standard HTTP tooling.
- *Good:* Strong consistency -- the caller gets an immediate response and knows the operation succeeded or failed.
- *Bad:* Creates runtime coupling. If the Pharmacy module calls the OPD module synchronously to fetch a prescription, and OPD is down, the Pharmacy request fails. This violates the fragmented adoption constraint where modules must tolerate absent siblings.
- *Bad:* Deployment coupling. Rolling out a new version of OPD requires ensuring all callers (Pharmacy, Billing, Lab) can handle both old and new API versions simultaneously, or coordinating deployments across modules.
- *Bad:* Cascading failures. A slow or unresponsive module propagates latency to all callers, creating system-wide degradation. Circuit breakers mitigate this but add complexity to every call site.
- *Bad:* No natural audit trail. Request/response pairs must be explicitly logged; they are not durable records of state changes the way events are.

### Event-driven async as default with sync as exception

- *Good:* Temporal decoupling -- the publisher does not need the consumer to be running. Essential for fragmented adoption and independent deployment.
- *Good:* Schema-per-module data ownership is naturally supported. Shared entities are projections synced via events. No shared tables, no cross-module foreign keys.
- *Good:* Events are immutable state-change records, providing a built-in audit trail for clinical workflows (who prescribed what, when it was dispensed, when the result was finalized).
- *Good:* The event bus absorbs load spikes. A burst of lab results does not directly hit the Billing module -- the events queue and the Billing module processes them at its own pace.
- *Bad:* Eventual consistency requires module teams to design for stale reads and handle the rare cases where absolute freshness is needed via the synchronous exception path.
- *Bad:* Event-driven architectures are harder to reason about for developers accustomed to synchronous request-response. Training and tooling investment is needed.
- *Bad:* Event schema evolution is a cross-cutting coordination concern that does not exist with purely local data models.

### Shared database for inter-module data

- *Good:* Strong consistency by default. A patient record updated by EMPI is immediately visible to Pharmacy via a SQL join. No projections, no eventual consistency.
- *Good:* Simplest implementation for shared entities -- one `patients` table, many readers.
- *Bad:* Destroys independent deployability. If EMPI and Pharmacy share the `patients` table, a schema migration in EMPI requires coordinating with Pharmacy (and every other consumer). This is the shared-database integration anti-pattern described extensively in integration architecture literature.
- *Bad:* Prevents fragmented adoption. A module that depends on a shared table cannot function when deployed without the module that owns that table. The shared table IS the coupling.
- *Bad:* Scaling is coupled. Heavy read load from Pharmacy's prescription queue hits the same database as EMPI's deduplication writes. There is no way to scale the read path independently.
- *Bad:* No natural audit trail. Database reads leave no record. State changes must be separately instrumented.

## Links

- Related ADRs: [ADR-0008](./0008-module-shape-and-boundaries.md), [ADR-0010](./0010-fhir-hl7-interop-standards.md) (FHIR R4 payload standard for clinical events -- see hybrid payload approach in Consequences above)
- Related HLD: [Module Shape Template -- section 6](../hld/03-module-shape-template.md#6-event-publication), [Module Shape Template -- section 7](../hld/03-module-shape-template.md#7-inter-module-communication-hierarchy), [System Overview -- section 3.3](../hld/01-system-overview.md#33-no-cross-module-synchronous-dependencies-by-default)
- External sources:
  - Martin Kleppmann, *Designing Data-Intensive Applications* (O'Reilly, 2017), chapter 11 -- stream processing, event logs as the source of integration between systems
  - Chris Richardson, *Microservices Patterns* (Manning, 2018), chapters 3--4 -- Saga pattern for distributed transactions, event-driven communication between services
