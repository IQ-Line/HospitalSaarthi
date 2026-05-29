import type { AbdmAdapterDeps } from "../integrations/abdm/ports.js";
import type { IntegrationProfileRepo } from "./integration-profile-repo.js";
import type { TenantIntegrationProfile } from "./integration-context.js";

/** Process-wide singletons — constructed once in integration-hub-svc (Code PR 3). */
export interface IntegrationHubSharedInfra {
  profiles: IntegrationProfileRepo;
  // Drizzle repos, fidelius, eventBus, EMPI/RF clients added in Code PR 2–3
}

export async function buildAbdmDepsForTenant(
  iqTenantId: string,
  shared: IntegrationHubSharedInfra,
): Promise<AbdmAdapterDeps> {
  throw new Error(
    `buildAbdmDepsForTenant is not implemented until Code PR 2 (tenant=${iqTenantId}, profiles=${Boolean(shared.profiles)})`,
  );
}

export function mapConfiguratorProfileRow(
  row: Record<string, unknown>,
): TenantIntegrationProfile {
  return {
    id: String(row["id"]),
    iqTenantId: String(row["iq_tenant_id"]),
    integrationKind: "abdm",
    hipId: String(row["hip_id"]),
    hiuId: String(row["hiu_id"]),
    cmId: String(row["cm_id"] ?? "sbx"),
    clientId: (row["client_id"] as string | null) ?? null,
    clientSecret: (row["client_secret"] as string | null) ?? null,
    defaultSmsPhone: (row["default_sms_phone"] as string | null) ?? null,
    hipDisplayName: (row["hip_display_name"] as string | null) ?? null,
    callbackBaseUrl: (row["callback_base_url"] as string | null) ?? null,
    smsProvider: (row["sms_provider"] as string | null) ?? null,
    smsConfig: (row["sms_config"] as Record<string, unknown>) ?? {},
    gatewayEnvironment: String(row["gateway_environment"] ?? "sandbox"),
  };
}
