import type { EventBus } from './event-bus.interface.js';
import type { EventBusConfig } from './types.js';
import { InProcessEventBus } from './in-process-event-bus.js';

export function createEventBus(config: EventBusConfig): EventBus {
  if (config.type === 'in-process') {
    return new InProcessEventBus({
      validateEnvelope: config.validateEnvelope,
    });
  }

  const _exhaustive: never = config.type;
  throw new Error(`Unknown event bus type: ${_exhaustive}`);
}
