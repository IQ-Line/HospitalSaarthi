import { randomUUID } from "node:crypto";
import type { DomainEvent, EventBus } from "@hims/ts-sdk-events";
import { createEnvelope } from "@hims/ts-sdk-events";

/** Envelope pattern: `<module>.<entity>.<action>` (see ts-sdk-events validateEnvelope). */
export const MODULE_ENABLED_EVENT = "configurator.tenant_module.enabled" as const;
export const MODULE_DISABLED_EVENT = "configurator.tenant_module.disabled" as const;
export const TENANT_MODULE_EVENT_CONTRACT_VERSION = "1.0.0" as const;

export type TenantModuleLifecyclePayload = {
  module_id: string;
  is_active: boolean;
  is_core_override: boolean;
  /** ISO timestamp of the tenant_modules row after mutation. */
  updated_at: string;
} & Record<string, unknown>;

export async function publishTenantModuleLifecycleEvent(
  eventBus: EventBus,
  input: {
    eventType: typeof MODULE_ENABLED_EVENT | typeof MODULE_DISABLED_EVENT;
    iqTenantId: string;
    moduleId: string;
    isActive: boolean;
    isCoreOverride: boolean;
    updatedAt: Date;
    correlationId?: string;
    actorId?: string;
  },
): Promise<DomainEvent<TenantModuleLifecyclePayload>> {
  const payload: TenantModuleLifecyclePayload = {
    module_id: input.moduleId,
    is_active: input.isActive,
    is_core_override: input.isCoreOverride,
    updated_at: input.updatedAt.toISOString(),
  };

  const correlationId =
    typeof input.correlationId === "string" && input.correlationId.trim().length > 0
      ? input.correlationId.trim()
      : randomUUID();
  const actorId =
    typeof input.actorId === "string" && input.actorId.trim().length > 0
      ? input.actorId.trim()
      : randomUUID();

  const event = createEnvelope<TenantModuleLifecyclePayload>({
    event_type: input.eventType,
    source_module: "configurator",
    iq_tenant_id: input.iqTenantId,
    occurred_at: new Date().toISOString(),
    correlation_id: correlationId,
    actor_id: actorId,
    event_contract_version: TENANT_MODULE_EVENT_CONTRACT_VERSION,
    payload,
  });

  await eventBus.publish(event);
  return event;
}
