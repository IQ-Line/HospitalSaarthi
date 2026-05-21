import type { EventBus } from "@hims/ts-sdk-events";
import type { AbdmAdapterDeps } from "../ports.js";
import {
  handleCareContextRegisteredEvent,
  isCareContextRegisteredEvent,
} from "./consumers/care-context-registered.js";

export async function registerM2EventConsumers(
  eventBus: EventBus,
  deps: AbdmAdapterDeps,
): Promise<void> {
  const handler = async (event: Parameters<typeof handleCareContextRegisteredEvent>[0]) => {
    if (!isCareContextRegisteredEvent(event)) return;
    await handleCareContextRegisteredEvent(event, deps);
  };

  await eventBus.subscribe("record-foundation.care-context.registered", handler);
  await eventBus.subscribe("record-foundation.care-context.created", handler);
}
