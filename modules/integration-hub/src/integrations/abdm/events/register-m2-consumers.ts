import type { EventBus } from "@hims/ts-sdk-events";
import type { IntegrationHubSharedInfra } from "../../../lib/build-abdm-deps.js";
import { buildAbdmDepsForTenant } from "../../../lib/build-abdm-deps.js";
import {
  handleCareContextRegisteredEvent,
  isCareContextRegisteredEvent,
} from "./consumers/care-context-registered.js";

export async function registerM2EventConsumers(
  eventBus: EventBus,
  sharedInfra: IntegrationHubSharedInfra,
): Promise<void> {
  const enabled =
    process.env["ABDM_M2_ORCHESTRATE_ON_CARE_CONTEXT_EVENT"] === "true" ||
    process.env["INTEGRATION_HUB_ABDM_M2_ORCHESTRATE_ON_CARE_CONTEXT_EVENT"] === "true";
  if (!enabled) {
    return;
  }

  const handler = async (event: Parameters<typeof handleCareContextRegisteredEvent>[0]) => {
    if (!isCareContextRegisteredEvent(event)) return;
    const iqTenantId = event.iq_tenant_id?.trim();
    if (!iqTenantId) {
      throw new Error("record-foundation care-context event missing iq_tenant_id on envelope");
    }
    const { deps } = await buildAbdmDepsForTenant(iqTenantId, sharedInfra);
    await handleCareContextRegisteredEvent(event, deps);
  };

  await eventBus.subscribe("record-foundation.care-context.registered", handler);
  await eventBus.subscribe("record-foundation.care-context.created", handler);
}
