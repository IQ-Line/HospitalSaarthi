import type { IntegrationConfig, IntegrationDirection } from "./integration.types.js";

export type IntegrationTypeDefinition = {
  integration_type: string;
  display_name: string;
  direction: IntegrationDirection;
  /** UX defaults — not authoritative for auth (UM capabilities are). */
  default_config: IntegrationConfig;
};

export const INTEGRATION_TYPE_CATALOG: Record<string, IntegrationTypeDefinition> = {
  smart_report: {
    integration_type: "smart_report",
    display_name: "Smart Report",
    direction: "inbound",
    default_config: {
      allowedOperations: ["registration.listRegistrations", "empi.getPatient"],
      capabilityKeys: ["registration:registration:read", "empi:patient:read"],
    },
  },
};

export function resolveIntegrationType(type: string): IntegrationTypeDefinition | null {
  const key = type.trim().toLowerCase();
  return INTEGRATION_TYPE_CATALOG[key] ?? null;
}
