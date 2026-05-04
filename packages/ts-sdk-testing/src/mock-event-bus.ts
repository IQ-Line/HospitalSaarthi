export interface DomainEvent<T extends Record<string, unknown> = Record<string, unknown>> {
  readonly event_id: string;
  readonly event_type: string;
  readonly source_module: string;
  readonly iq_tenant_id: string;
  readonly timestamp: string;
  readonly correlation_id: string;
  readonly actor_id: string;
  readonly schema_version: string;
  readonly payload: T;
}

export type EventHandler<T extends Record<string, unknown> = Record<string, unknown>> = (
  event: DomainEvent<T>,
) => Promise<void>;

export interface Subscription {
  unsubscribe(): Promise<void>;
}

export interface EventBus {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  publish(event: DomainEvent): Promise<void>;
  subscribe(eventType: string, handler: EventHandler): Promise<Subscription>;
}

export class MockEventBus implements EventBus {
  private readonly published: DomainEvent[] = [];
  private readonly subscribers = new Map<string, Set<EventHandler>>();

  async connect(): Promise<void> {}

  async disconnect(): Promise<void> {
    this.subscribers.clear();
  }

  async publish(event: DomainEvent): Promise<void> {
    this.published.push(event);

    const handlers = this.subscribers.get(event.event_type);
    if (!handlers || handlers.size === 0) return;

    await Promise.allSettled([...handlers].map((h) => h(event)));
  }

  async subscribe(eventType: string, handler: EventHandler): Promise<Subscription> {
    let handlers = this.subscribers.get(eventType);
    if (!handlers) {
      handlers = new Set();
      this.subscribers.set(eventType, handlers);
    }
    handlers.add(handler);

    return {
      unsubscribe: async () => {
        this.subscribers.get(eventType)?.delete(handler);
      },
    };
  }

  getPublishedEvents(): readonly DomainEvent[] {
    return this.published;
  }

  getEventsByType(eventType: string): readonly DomainEvent[] {
    return this.published.filter((e) => e.event_type === eventType);
  }

  clear(): void {
    this.published.length = 0;
  }

  reset(): void {
    this.published.length = 0;
    this.subscribers.clear();
  }
}
