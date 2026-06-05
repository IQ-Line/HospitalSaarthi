import { IntegrationInvalidStateError, IntegrationNotFoundError } from "../domain/integration-errors.js";
import { generateApiKey, hashApiKey } from "../domain/api-key-crypto.js";
import type { IssuedApiKey } from "../domain/integration.types.js";
import type { IntegrationApiKeysRepository, IntegrationsRepository } from "../ports.js";

export type IssueApiKeyDeps = {
  integrationsRepository: IntegrationsRepository;
  integrationApiKeysRepository: IntegrationApiKeysRepository;
};

export async function issueApiKey(
  deps: IssueApiKeyDeps,
  input: {
    tenantId: string;
    integrationId: string;
    label: string;
    actorId: string | null;
    isLive?: boolean;
    rateLimitRpm?: number | null;
    expiresAt?: Date | null;
  },
): Promise<IssuedApiKey> {
  const integration = await deps.integrationsRepository.getById(input.tenantId, input.integrationId);
  if (!integration) {
    throw new IntegrationNotFoundError();
  }
  if (integration.status !== "active") {
    throw new IntegrationInvalidStateError("API keys can only be issued for active integrations.");
  }

  const generated = generateApiKey(input.isLive ?? process.env.NODE_ENV === "production");
  const keyHash = await hashApiKey(generated.api_key);

  return deps.integrationApiKeysRepository.issue(input.tenantId, {
    integrationId: input.integrationId,
    keyPrefix: generated.key_prefix,
    keyHash,
    label: input.label,
    plaintextKey: generated.api_key,
    createdBy: input.actorId,
    rateLimitRpm: input.rateLimitRpm,
    expiresAt: input.expiresAt,
  });
}
