import {
  CapabilityNotFoundError,
  PartnerPrincipalAlreadyExistsError,
} from "../domain/errors.js";
import { normalizeCapabilityKey } from "../domain/capability-key.js";
import type { CapabilityRepository } from "../ports/index.js";
import type { PartnerPrincipalRepository } from "../ports/partner-principal-repository.js";
import type { User } from "../ports/index.js";

export type ProvisionPartnerPrincipalInput = {
  integrationId: string;
  integrationDisplayName: string;
  capabilityKeys: string[];
};

export type ProvisionPartnerPrincipalContext = {
  tenantId: string;
  actorId: string | null;
};

export type ProvisionPartnerPrincipalDeps = {
  partnerPrincipalRepository: PartnerPrincipalRepository;
  capabilityRepository: CapabilityRepository;
};

/**
 * Creates a non-loginable partner principal (1:1 with integration_id).
 * Idempotent create only — rejects when a principal already exists.
 */
export async function provisionPartnerPrincipal(
  deps: ProvisionPartnerPrincipalDeps,
  ctx: ProvisionPartnerPrincipalContext,
  input: ProvisionPartnerPrincipalInput,
): Promise<User> {
  const existing = await deps.partnerPrincipalRepository.findByIntegrationId(
    ctx.tenantId,
    input.integrationId,
  );
  if (existing !== null) {
    throw new PartnerPrincipalAlreadyExistsError(input.integrationId);
  }

  const normalizedKeys = [
    ...new Set(input.capabilityKeys.map((key) => normalizeCapabilityKey(key))),
  ].filter((key) => key.length > 0);

  const capabilities =
    normalizedKeys.length > 0
      ? await deps.capabilityRepository.listCapabilitiesByKeys(normalizedKeys)
      : [];

  if (capabilities.length !== normalizedKeys.length) {
    const found = new Set(capabilities.map((cap) => cap.capability_key));
    const missing = normalizedKeys.filter((key) => !found.has(key));
    throw new CapabilityNotFoundError(missing[0]);
  }

  return deps.partnerPrincipalRepository.provisionPartnerPrincipal(ctx.tenantId, {
    integrationId: input.integrationId,
    integrationDisplayName: input.integrationDisplayName,
    capabilityIds: capabilities.map((cap) => cap.id),
    actorId: ctx.actorId,
  });
}
