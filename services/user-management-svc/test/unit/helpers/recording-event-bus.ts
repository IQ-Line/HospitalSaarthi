import type { DomainEvent, EventBus } from "@hims/ts-sdk-events";

export type RecordingEventBus = {
  bus: EventBus;
  published: DomainEvent[];
  subscriptions: string[];
  isConnected: () => boolean;
};

/**
 * In-memory EventBus fake: records published events, subscriptions, and connection
 * state so tests can assert on them (or ignore them, for a pure stand-in).
 */
export function createRecordingEventBus(): RecordingEventBus {
  const published: DomainEvent[] = [];
  const subscriptions: string[] = [];
  let connected = false;
  const bus: EventBus = {
    async connect() {
      connected = true;
    },
    async disconnect() {
      connected = false;
    },
    async publish(event) {
      published.push(event);
    },
    async subscribe(eventType) {
      subscriptions.push(eventType);
      return {
        async unsubscribe() {
          const at = subscriptions.indexOf(eventType);
          if (at !== -1) subscriptions.splice(at, 1);
        },
      };
    },
  };
  return { bus, published, subscriptions, isConnected: () => connected };
}
