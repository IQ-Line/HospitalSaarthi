import {
  generateTenantApiKeySecret,
  hashTenantApiKeySecret,
} from "@hims/ts-sdk-api-key";
import { ConfiguratorError } from "../errors.js";
import type { TenantApiKeyRepo, TenantRepo } from "../ports.js";
import type {
  TenantApiKeyCreateResult,
  TenantApiKeyEnvironment,
} from "../domain/tenant-api-key.types.js";

export interface CreateTenantApiKeyInput {
  label?: string | null;
  environment: TenantApiKeyEnvironment;
  expires_at?: string | null;
}

export async function createTenantApiKey(
  repo: TenantApiKeyRepo,
  tenantRepo: TenantRepo,
  tenantId: string,
  input: CreateTenantApiKeyInput,
  actorId?: string | null,
): Promise<TenantApiKeyCreateResult> {
  const tenant = await tenantRepo.findById(tenantId);
  if (!tenant) {
    throw new ConfiguratorError(404, "tenant not found");
  }

  const { secret, prefix } = generateTenantApiKeySecret(input.environment);
  const keyHash = hashTenantApiKeySecret(secret);

  const created = await repo.create({
    iq_tenant_id: tenantId,
    key_prefix: prefix,
    key_hash: keyHash,
    label: input.label ?? null,
    environment: input.environment,
    expires_at: input.expires_at ?? null,
    created_by: actorId ?? null,
  });

  return { ...created, secret };
}
