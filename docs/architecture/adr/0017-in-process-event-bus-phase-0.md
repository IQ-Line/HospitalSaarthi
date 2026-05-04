# ADR-0017: InProcessEventBus as Phase 0 event transport

- **Status:** Proposed
- **Date:** 2026-05-04
- **Deciders:** [Architect], [Tech Lead], [Engineering Manager]

## Context and problem statement

[ADR-0009](./0009-event-driven-inter-module-communication.md) established event-driven async as the default inter-module communication mechanism. The event bus technology (Kafka, NATS, RabbitMQ) was deliberately left as an open decision. Before the first module is built, the team needs a working event infrastructure that modules code against — but deploying and operating a message broker for a 7-person team building their first four platform modules is premature operational overhead.

The question is: how do modules publish and consume events during Phase 0 (core module development) without requiring an external broker, while ensuring zero code changes when the broker is introduced later?

## Decision drivers

- **Module code must be broker-agnostic from day one.** The `ts-sdk-events` package defines the `EventBus` interface that modules code against. The concrete adapter (in-process, Kafka, NATS) is injected by the service wrapper. Modules must never import a broker-specific library.
- **Operational simplicity during Phase 0.** The first four modules (User Management, Configurator, EMPI, Master Data) have limited cross-module events. Running Kafka or NATS adds infrastructure complexity (Zookeeper/KRaft, topic management, consumer groups) without proportional value.
- **Envelope validation must be exercised early.** If envelope validation only runs when the real broker is deployed, malformed events accumulate undetected during months of development. The Phase 0 adapter must validate the standard envelope on every publish.
- **Embedded mode needs an in-process adapter permanently.** The embedded deployment mode ([ADR-0016 §6.2](./0016-polyglot-nx-monorepo-spec-first-contracts.md), [module shape template §1.1](../hld/03-module-shape-template.md)) runs multiple modules in a single process with no external broker. An in-process event adapter is not just a Phase 0 stopgap — it is a permanent production requirement for embedded deployments.

## Decision outcome

**Build an `InProcessEventBus` class** inside `packages/ts-sdk-events/` that implements the same `EventBus` interface as future Kafka/NATS adapters. It dispatches events synchronously within a single process using a subscriber map with `Promise.allSettled` for consumer isolation.

### How it works

```typescript
// Interface (packages/ts-sdk-events/src/interface.ts)
interface EventBus {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  publish(event: DomainEvent): Promise<void>;
  subscribe(eventType: string, handler: EventHandler): Promise<Subscription>;
}

// InProcessEventBus (packages/ts-sdk-events/src/adapters/in-process.ts)
class InProcessEventBus implements EventBus {
  private subscribers = new Map<string, Set<EventHandler>>();

  async connect() { /* no-op */ }
  async disconnect() { this.subscribers.clear(); }

  async publish(event: DomainEvent) {
    validateEnvelope(event);  // Always validate, even in-process
    const handlers = this.subscribers.get(event.event_type);
    if (!handlers) return;
    const results = await Promise.allSettled(
      [...handlers].map(h => h(event))
    );
    for (const r of results) {
      if (r.status === 'rejected') {
        logger.error('Event handler failed', {
          event_type: event.event_type, error: r.reason
        });
      }
    }
  }

  async subscribe(eventType: string, handler: EventHandler) {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, new Set());
    }
    this.subscribers.get(eventType)!.add(handler);
    return { unsubscribe: async () => {
      this.subscribers.get(eventType)?.delete(handler);
    }};
  }
}
```

The `createEventBus(config)` factory function selects the adapter:
- `{ type: 'in-process' }` → `InProcessEventBus` (Phase 0 service mode + permanent embedded mode)
- `{ type: 'nats', url: '...' }` → `NatsEventBus` (future)
- `{ type: 'kafka', brokers: [...] }` → `KafkaEventBus` (future)

The service wrapper chooses the adapter:
```typescript
// services/empi-svc/src/main.ts
const eventBus = createEventBus({ type: process.env.EVENT_BUS_TYPE || 'in-process' });
```

### What is preserved

- **Decoupling.** Publishers do not know who consumes their events. The subscriber map is internal to the bus.
- **Envelope validation.** `validateEnvelope()` runs on every publish, catching malformed events immediately — not months later when the real broker is deployed.
- **Correlation ID propagation.** The standard envelope fields (`correlation_id`, `actor_id`, `iq_tenant_id`) are present and validated.
- **Schema versioning.** The `schema_version` field in the envelope is validated. Consuming modules can check version compatibility.
- **The full publish API.** Module code calls `eventBus.publish(event)` — identical whether the bus is in-process, NATS, or Kafka.

### What is lost (accepted for Phase 0)

- **Durability.** Events exist only in memory. If the process crashes mid-dispatch, in-flight events are lost. A real broker provides persistent storage and replay.
- **Retry and dead-letter queues.** If a consumer fails, the event is logged but not retried. A real broker provides configurable retry policies and DLQ routing.
- **Ordering guarantees.** `Promise.allSettled` dispatches consumers concurrently. A real broker can provide partition-level ordering (Kafka) or queue-level ordering (NATS JetStream).
- **Cross-process delivery.** Events do not leave the process boundary. In Phase 0 service mode (separate pods, no broker), cross-module events between pods are not delivered. These interactions use the synchronous exception path (generated OpenAPI clients) until the broker is deployed.

### Upgrade path

When the team decides on a broker (follow-up from [ADR-0009](./0009-event-driven-inter-module-communication.md)):

1. Implement `NatsEventBus` or `KafkaEventBus` in `packages/ts-sdk-events/src/adapters/`.
2. Change the service wrapper's environment variable: `EVENT_BUS_TYPE=nats`.
3. Module code does not change. Not a single import, not a single function call.
4. The `InProcessEventBus` remains the adapter for embedded-mode deployments and for `ts-sdk-testing`'s integration tests.

### Consequences

**Positive:**

- Zero infrastructure overhead during Phase 0. No Kafka cluster, no NATS server, no topic management. The event bus is a Map in memory.
- Envelope validation is battle-tested from day one. When the real broker is introduced, the team is confident that all published events conform to the standard envelope.
- Module developers write event-driven code from the start. The patterns, the interfaces, the test fixtures — all established before the broker arrives.
- Embedded mode gets its permanent adapter for free.

**Negative / accepted trade-offs:**

- Cross-module events between separate pods do not work in Phase 0. Mitigation: the first four modules have limited cross-module events, and the synchronous exception path (OpenAPI clients) handles the narrow cases that need real-time cross-module communication.
- Developers may forget that in-process dispatch is not the same as broker-based dispatch (no durability, no retry). Mitigation: the LLD and onboarding docs explicitly list what is lost, and the `createEventBus` factory logs a warning at startup when using the in-process adapter in non-test environments.

---

## Follow-up actions

- [ ] Select the event bus technology (Kafka, NATS, RabbitMQ) in a dedicated ADR when cross-module event volume justifies the infrastructure.
- [ ] Build a `MockEventBus` in `ts-sdk-testing` that records published events for assertion (distinct from InProcessEventBus which actually dispatches).

## Links

- Parent ADR: [ADR-0009](./0009-event-driven-inter-module-communication.md) (event-driven inter-module communication)
- Related ADR: [ADR-0016](./0016-polyglot-nx-monorepo-spec-first-contracts.md) (Nx monorepo, library-first modules, deployment modes)
- Related HLD: [Module Shape Template §6-7](../hld/03-module-shape-template.md#6-event-publication) (event publication, inter-module communication hierarchy)
- Related LLD: [Repo Structure — Monorepo Setup §4](../lld/repo-structure/01-monorepo-setup.md#4-shared-sdk-packages) (ts-sdk-events package)
