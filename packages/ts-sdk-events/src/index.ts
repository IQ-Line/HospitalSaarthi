export type {
  DomainEvent,
  EventHandler,
  Subscription,
  EventBusConfig,
} from './types.js';

export type { EventBus } from './event-bus.interface.js';

export {
  createEnvelope,
  validateEnvelope,
  EnvelopeValidationError,
} from './envelope.js';
export type { CreateEnvelopeInput } from './envelope.js';

export { InProcessEventBus } from './in-process-event-bus.js';

export { createEventBus } from './factory.js';
