import type { Integration } from "../domain/integration.types.js";
import type { IntegrationRepository } from "../ports.js";

export type ListIntegrationsDeps = {
  integrationRepository: IntegrationRepository;
};

export async function listIntegrations(
  deps: ListIntegrationsDeps,
  tenantId: string,
): Promise<Integration[]> {
  return deps.integrationRepository.list(tenantId);
}
