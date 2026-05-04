import type { EventBus } from './event-bus.interface.js';
import type { DomainEvent, EventHandler, Subscription } from './types.js';
import { validateEnvelope } from './envelope.js';

export class InProcessEventBus implements EventBus {
  private readonly subscribers = new Map<string, Set<EventHandler>>();
  private readonly shouldValidate: boolean;

  constructor(options?: { validateEnvelope?: boolean }) {
    this.shouldValidate = options?.validateEnvelope ?? true;
  }

  async connect(): Promise<void> {
    // No-op for in-process bus
  }

  async disconnect(): Promise<void> {
    this.subscribers.clear();
  }

  async publish(event: DomainEvent): Promise<void> {
    if (this.shouldValidate) {
      validateEnvelope(event);
    }

    const handlers = this.subscribers.get(event.event_type);
    if (!handlers || handlers.size === 0) return;

    const results = await Promise.allSettled(
      [...handlers].map((handler) => handler(event)),
    );

    for (const result of results) {
      if (result.status === 'rejected') {
        console.error(
          `[ts-sdk-events] Handler failed for ${event.event_type}:`,
          result.reason,
        );
      }
    }
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
}
