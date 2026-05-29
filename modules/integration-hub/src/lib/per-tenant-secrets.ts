import type { SecretsClient } from "../integrations/abdm/ports.js";
import type { TenantIntegrationProfile } from "./integration-context.js";

/**
 * Resolves OAuth client credentials from a tenant profile row.
 * Wired in Code PR 2; Phase 1a stores plaintext in configurator.
 */
export function createSecretsClientFromProfile(
  profile: TenantIntegrationProfile,
): SecretsClient {
  throw new Error(
    `createSecretsClientFromProfile is not implemented until Code PR 2 (tenant=${profile.iqTenantId})`,
  );
}
