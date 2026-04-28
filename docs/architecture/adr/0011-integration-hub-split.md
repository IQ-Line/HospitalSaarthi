# ADR-0011: Integration Hub split (inbound/outbound, shared control plane)

- **Status:** Proposed
- **Date:** 2026-04-28
- **Deciders:** [Engineering Manager], [Architect]

## Context and problem statement

The HIMS platform must integrate with a wide range of external systems: legacy HIS installations, ABDM/NHA registries, insurance providers, lab analyzers, radiology systems (PACS/RIS), and state reporting endpoints. These integrations span multiple protocols (FHIR R4, HL7v2, proprietary APIs), multiple authentication models (API keys, mTLS, OAuth), and two fundamentally different traffic directions -- external systems calling into the platform, and the platform calling out to external systems. The architecture must organize this integration surface in a way that allows independent scaling, clear failure isolation, and manageable operational complexity, while avoiding duplication of shared infrastructure like credential management and integration configuration. See [HLD 05 -- Integration and Interop, sections 1--4 and 7](../hld/05-integration-and-interop.md#1-integration-hub-overview).

## Decision drivers

- **Different reliability patterns per direction** -- inbound traffic is unpredictable, externally driven, and must be rate-limited and validated before reaching platform modules. Outbound traffic is platform-initiated, follows retry and circuit-breaking patterns, and must manage external credentials. These are distinct operational concerns with different scaling and monitoring profiles ([HLD 05 section 1](../hld/05-integration-and-interop.md#1-integration-hub-overview)).
- **ABDM bidirectional flows** -- many ABDM interactions blur the inbound/outbound boundary. An external HIU requests health records (inbound), but the data response flows out (outbound). The architecture must handle these as first-class bidirectional flows, not edge cases ([HLD 05 section 1.1](../hld/05-integration-and-interop.md#11-the-blurred-boundary--abdm-flows)).
- **Fragmented adoption as infrastructure** -- in fragmented deployments, the Inbound Gateway is the mechanism that connects a legacy HIS to an adopted platform module. It is platform infrastructure (always deployed), not an optional feature. Architecturally, it is to external systems what the BFF is to the frontend ([HLD 05 section 2.5](../hld/05-integration-and-interop.md#25-the-fragmented-adoption-story)).
- **Shared operational infrastructure** -- both inbound and outbound integrations need an integration registry, credential management, mapping/translation engine, observability, and audit logging. Duplicating this infrastructure across two independent services would be wasteful and create consistency risks ([HLD 05 section 7](../hld/05-integration-and-interop.md#7-shared-control-plane)).
- **Audit and compliance** -- every external data exchange must be logged for regulatory compliance (direction, integration identifier, timestamp, outcome, correlation ID). A shared audit stream across both directions provides a unified compliance view ([HLD 05 section 7.5](../hld/05-integration-and-interop.md#75-audit-stream)).

## Considered options

1. **Single monolithic integration service** -- one service handles all inbound and outbound integration traffic, including protocol translation, credential management, rate limiting, retry logic, and mapping.
2. **Inbound Gateway + Outbound Connector with shared control plane** -- two runtime services (Inbound Gateway for external-to-platform traffic, Outbound Connector for platform-to-external traffic) sharing a common control plane (integration registry, mapping/translation engine, credentials vault, observability, audit).
3. **Per-module integration adapters (no centralized hub)** -- each module handles its own external integrations directly. Modules embed HL7v2 parsers, FHIR translators, and external-system clients as needed.

## Decision outcome

Chosen option: **Inbound Gateway + Outbound Connector with shared control plane**, because inbound and outbound traffic have fundamentally different operational characteristics that benefit from independent scaling, deployment, and failure isolation, while the shared control plane avoids duplicating the integration registry, credential vault, mapping engine, and audit infrastructure that both directions need.

### Consequences

**Positive:**

- Independent scaling and failure isolation. A spike in inbound HL7v2 messages from lab analyzers does not affect the Outbound Connector's ability to submit ABDM health record responses. An outbound circuit breaker opening on a failing insurance provider does not degrade inbound request processing. Each service has its own resource allocation, health checks, and alerting thresholds.
- ABDM bidirectional flows are handled explicitly. ABDM callback endpoints are registered on the Inbound Gateway. When an external HIU initiates a health record request, the Inbound Gateway receives and authenticates it, then invokes the Outbound Connector to deliver the response. The two services collaborate through the shared control plane, and the correlation_id links the inbound request to the outbound response in the audit trail.
- Fragmented adoption is structurally enabled. The Inbound Gateway acts as the bridge between a legacy HIS and an adopted platform module -- receiving HL7v2 messages from the legacy system, translating them via the mapping engine, and routing them to the appropriate module. This is infrastructure, not a feature that each module must build.
- The shared control plane provides a single source of truth for all integration configuration. An administrator configures an integration once in the integration registry (protocol, authentication method, rate limits, mappings, credentials), and both the Inbound Gateway and Outbound Connector use that configuration. No duplication, no drift.

**Negative / accepted trade-offs:**

- Two services plus a shared control plane is more operationally complex than a single service. The team must deploy and monitor two services, manage the shared control plane's availability (it is a dependency of both), and handle the coordination required for ABDM bidirectional flows. This complexity is justified by the scaling and isolation benefits, but it requires operational maturity.
- The shared control plane is a coupling point. If the integration registry or credentials vault is unavailable, both the Inbound Gateway and Outbound Connector are degraded. Mitigation: both services cache their integration configuration and credentials locally with TTLs, similar to how modules cache Configurator data. A control-plane outage degrades (stale config) rather than halts integration processing.
- The ABDM bidirectional flow coordination between Inbound Gateway and Outbound Connector adds an internal communication path that must be reliable. If the Outbound Connector cannot be reached by the Inbound Gateway during an ABDM health record response, the flow fails. This is mitigated by treating the intra-hub communication as an internal event or queued message, not a synchronous call.

**Follow-up actions:**

- [ ] Define the control plane's data model: integration registry schema, credential storage structure, mapping definition format.
- [ ] Design the ABDM bidirectional flow choreography in detail -- how the Inbound Gateway hands off to the Outbound Connector, what happens on partial failure, and how the correlation_id links the request-response pair.
- [ ] Define the Inbound Gateway's authentication adapter interface for the three supported mechanisms (API keys, mTLS, OAuth client credentials).
- [ ] Catalogue the initial set of HL7v2 message mappings required for common Indian hospital lab analyzers and legacy HIS vendors.
- [ ] Design the Configurator integration for the control plane's admin UI -- integration registry and mapping configuration should be managed through the Configurator's existing admin interface pattern.
- [ ] Evaluate workflow engines (Temporal, Inngest, custom FSM) for ABDM and other multi-turn integration flows -- likely an LLD-phase decision for the Integration Hub.

### Durable workflow state machines for multi-turn external integrations

ABDM's Health Information Exchange (HIE) flows are multi-turn, webhook-based, stateful workflows that cannot be modeled as simple request-response interactions:

- **Consent flow:** consent request --> patient approval --> data fetch --> data push --> acknowledgment
- **Health Information request flow:** request --> consent verification --> data preparation --> encrypted transfer --> acknowledgment

These workflows span hours or days, with timeouts, retries, and compensating actions (e.g., a consent that expires before data is fetched, a data push that fails and must be retried with backoff, or a request that must be cancelled and unwound). The Integration Hub should implement these as **durable workflow state machines** -- either via a workflow engine (e.g., Temporal, Inngest) or a custom finite-state-machine framework backed by persistent storage. The key properties are: each workflow instance has an explicit state, transitions are durable (survive process restarts), timeouts trigger automatic transitions (e.g., consent expiry --> cancelled), and every transition is auditable.

The state machine pattern applies beyond ABDM:

- **Insurance claim workflows:** claim submission --> adjudication --> payment or rejection --> appeal (multi-day, with external webhook callbacks at each stage)
- **Lab order lifecycle:** order --> sample collection --> result --> verification --> distribution (multi-step, with external lab analyzer integrations at the result stage)
- **Any external integration with multi-turn webhook callbacks** where the platform must track "where are we in this conversation" across process boundaries and time

The Inbound Gateway receives the external webhook callbacks that advance workflow state; the Outbound Connector sends the platform-initiated messages that begin or continue workflows. The shared control plane stores the workflow state machines and provides the durability guarantees. This three-way collaboration (Inbound, Outbound, control plane) is a first-class use case of the split architecture, not an afterthought.

## Pros and cons of the options

### Single monolithic integration service

- *Good:* Simplest deployment model. One service to deploy, monitor, and scale. No intra-hub communication needed for bidirectional flows -- inbound and outbound logic share memory space.
- *Good:* No shared control plane dependency. All integration infrastructure (registry, credentials, mappings) is local to the single service.
- *Bad:* Inbound and outbound traffic compete for the same resources. A burst of inbound HL7v2 messages from lab analyzers can starve outbound ABDM submissions. Rate limiting on the inbound side must be carefully tuned to protect outbound processing, and vice versa. In practice, this coupling leads to either over-provisioning or mutual interference.
- *Bad:* Failure domains are merged. A bug in outbound retry logic (e.g., a thread pool leak from a failing circuit breaker) can crash the service, taking down inbound processing as well. Separate services contain failures to their direction.
- *Bad:* Scaling granularity is coarse. If inbound traffic spikes (e.g., during a mass lab-result upload), the entire integration service must scale, including the outbound logic that is not under load.

### Inbound Gateway + Outbound Connector with shared control plane

- *Good:* Independent scaling -- inbound and outbound scale based on their own traffic patterns, not each other's.
- *Good:* Independent failure isolation -- an outbound circuit-breaker cascade does not take down inbound request processing.
- *Good:* Separation of concerns aligns with operational reality: inbound is about rate limiting, validation, and protocol translation of unpredictable external requests; outbound is about retry, circuit breaking, and credential management for platform-initiated calls. Different teams or on-call rotations can own each.
- *Good:* The shared control plane avoids duplicating the integration registry, credential vault, and mapping engine while providing a single admin interface for all integration configuration.
- *Bad:* Two services plus a control plane is more complex to deploy and operate than a single service.
- *Bad:* ABDM bidirectional flows require cross-service coordination between the Inbound Gateway and Outbound Connector.
- *Bad:* The shared control plane is a coupling point whose failure degrades both directions (mitigated by local caching).

### Per-module integration adapters (no centralized hub)

- *Good:* Maximum decoupling. Each module owns its external integrations end-to-end. No central service to coordinate with or depend on.
- *Good:* No single point of failure for integrations. If the Lab module's HL7v2 adapter fails, it does not affect the Pharmacy module's insurance integration.
- *Bad:* Duplicated infrastructure across every module. Each module that needs HL7v2 parsing must embed an HL7v2 parser. Each module managing external credentials must implement credential rotation. Each module doing rate limiting must build its own rate limiter. This violates DRY at the infrastructure level and multiplies the security surface for credential management.
- *Bad:* No unified integration view. An administrator cannot see all external integrations in one place, monitor their health collectively, or configure them through a single interface. Each module has its own integration configuration surface.
- *Bad:* HL7v2 expertise must be spread across every module team that integrates with legacy systems, rather than concentrated in a specialized Integration Hub team. Given the scarcity of HL7v2 knowledge, this is impractical.
- *Bad:* ABDM flows that span multiple modules (e.g., a health record request that touches Lab, Radiology, and Pharmacy data) have no natural coordinator. Each module would need to participate in ABDM choreography independently, with no central orchestration point.

## Links

- Related ADRs: [ADR-0008](./0008-module-shape-and-boundaries.md), [ADR-0009](./0009-event-driven-inter-module-communication.md), [ADR-0010](./0010-fhir-hl7-interop-standards.md)
- Related HLD: [Integration and Interop -- sections 1--4](../hld/05-integration-and-interop.md#1-integration-hub-overview), [Integration and Interop -- section 7](../hld/05-integration-and-interop.md#7-shared-control-plane), [System Overview -- section 8](../hld/01-system-overview.md#8-deployment-topologies-summary)
- External sources:
  - Chris Richardson, *Microservices Patterns* (Manning, 2018), chapter 8 -- API Gateway pattern, distinguishing between external-facing gateways and internal service communication
  - Gregor Hohpe and Bobby Woolf, *Enterprise Integration Patterns* (Addison-Wesley, 2003) -- messaging channels, message routing, protocol translation, and the canonical data model pattern that underpins the shared mapping/translation engine
  - Temporal Technologies, "Temporal Documentation", https://docs.temporal.io/, accessed 2026-04-28 (reference for the durable workflow state machine pattern described in Consequences above -- not a technology decision at this stage)
