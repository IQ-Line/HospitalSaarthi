import { EnvSecretsClient } from "../integrations/abdm/data-access/env-secrets.client.js";
import type { SecretsClient } from "../integrations/abdm/ports.js";
import type { TenantIntegrationProfile } from "./integration-context.js";

export const PROFILE_CLIENT_ID_REF = "profile:client_id";
export const PROFILE_CLIENT_SECRET_REF = "profile:client_secret";

const ENV_REF = /^env:(.+)$/;

/**
 * Resolves OAuth credentials from the tenant profile row.
 * Supports `profile:client_id` / `profile:client_secret` and optional `env:VAR` fallback.
 */
export class ProfileSecretsClient implements SecretsClient {
  constructor(
    private readonly profile: TenantIntegrationProfile,
    private readonly envFallback: SecretsClient = new EnvSecretsClient(),
  ) {}

  async resolve(reference: string): Promise<string> {
    const ref = reference.trim();
    if (ref === PROFILE_CLIENT_ID_REF) {
      if (!this.profile.clientId) {
        throw new Error(`Missing client_id on integration profile for tenant ${this.profile.iqTenantId}`);
      }
      return this.profile.clientId;
    }
    if (ref === PROFILE_CLIENT_SECRET_REF) {
      if (!this.profile.clientSecret) {
        throw new Error(
          `Missing client_secret on integration profile for tenant ${this.profile.iqTenantId}`,
        );
      }
      return this.profile.clientSecret;
    }
    if (ENV_REF.test(ref)) {
      return this.envFallback.resolve(ref);
    }
    throw new Error(`Unsupported secret reference for profile-backed client: ${reference}`);
  }
}

export function createSecretsClientFromProfile(
  profile: TenantIntegrationProfile,
): SecretsClient {
  return new ProfileSecretsClient(profile);
}
