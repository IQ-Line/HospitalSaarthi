import type { DomainEvent, EventHandler, Subscription } from './types.js';

export interface EventBus {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  publish(event: DomainEvent): Promise<void>;
  subscribe(eventType: string, handler: EventHandler): Promise<Subscription>;
}
