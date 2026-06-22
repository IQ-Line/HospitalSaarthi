import type { EventBus } from "@hims/ts-sdk-events";
import type { CachedTenantEntitlementResolver } from "../../services/cached-tenant-entitlement-resolver.js";

/** Must match Configurator {@link publishTenantModuleLifecycleEvent} event types. */
export const MODULE_ENABLED_EVENT = "configurator.tenant_module.enabled" as const;
export const MODULE_DISABLED_EVENT = "configurator.tenant_module.disabled" as const;

export type TenantModuleEntitlementPortWithInvalidate = {
  invalidateTenantModuleCache?(tenantId?: string): void;
};

/**
 * Busts tenant entitlement caches when Configurator publishes module lifecycle events
 * (in-process bus only; cross-service uses HTTP invalidation hook).
 */
export async function registerTenantEntitlementCacheEventConsumers(
  eventBus: EventBus,
  tenantEntitlementResolver: CachedTenantEntitlementResolver,
  tenantModuleEntitlementPort?: TenantModuleEntitlementPortWithInvalidate,
): Promise<void> {
  const invalidate = (tenantId: string | undefined): void => {
    if (tenantId === undefined || tenantId.trim().length === 0) return;
    tenantEntitlementResolver.invalidateTenantEntitlementCache(tenantId);
    tenantModuleEntitlementPort?.invalidateTenantModuleCache?.(tenantId);
  };

  for (const eventType of [MODULE_ENABLED_EVENT, MODULE_DISABLED_EVENT] as const) {
    await eventBus.subscribe(eventType, async (event) => {
      invalidate(event.iq_tenant_id);
    });
  }
}
