import { ConfiguratorError } from "../errors.js";
import type { SequenceConfigurationRepo, TenantRepo } from "../ports.js";
import type {
  SequenceConfigurationDetail,
  SequenceConfigurationFilters,
  SequenceConfigurationSummary,
  UpsertIdentifierInput,
} from "../domain/sequence-configuration.js";
import {
  buildConfigurationDetail,
  resolveEffectiveIdentifier,
  validateAndBuildOverride,
  validateIdentifierType,
} from "../domain/sequence-configuration.js";

export async function listSequenceConfigurations(
  sequenceConfigurationRepo: SequenceConfigurationRepo,
  filters?: SequenceConfigurationFilters,
): Promise<SequenceConfigurationSummary[]> {
  return sequenceConfigurationRepo.listSummaries(filters);
}

export async function getSequenceConfiguration(
  tenantRepo: TenantRepo,
  sequenceConfigurationRepo: SequenceConfigurationRepo,
  tenantId: string,
): Promise<SequenceConfigurationDetail> {
  const tenant = await tenantRepo.findById(tenantId);
  if (!tenant) {
    throw new ConfiguratorError(404, "Tenant not found", "NOT_FOUND");
  }

  const row = await sequenceConfigurationRepo.findByTenantId(tenantId);
  return buildConfigurationDetail(
    {
      iq_tenant_id: tenant.iq_tenant_id,
      name: tenant.name,
      tenant_numeric_code: tenant.tenant_numeric_code ?? null,
    },
    row,
  );
}

export async function upsertSequenceIdentifier(
  tenantRepo: TenantRepo,
  sequenceConfigurationRepo: SequenceConfigurationRepo,
  tenantId: string,
  identifierTypeRaw: string,
  input: UpsertIdentifierInput,
  actorId: string | null,
) {
  const tenant = await tenantRepo.findById(tenantId);
  if (!tenant) {
    throw new ConfiguratorError(404, "Tenant not found", "NOT_FOUND");
  }

  const identifierType = validateIdentifierType(identifierTypeRaw);

  if (!input.is_custom) {
    await sequenceConfigurationRepo.removeIdentifier(tenantId, identifierType, actorId);

    const effective = resolveEffectiveIdentifier(identifierType, undefined);
    return {
      identifier_type: identifierType,
      is_custom: false,
      format_code: effective.format_code,
      segments: effective.segments,
    };
  }

  const override = validateAndBuildOverride(
    identifierType,
    input,
    tenant.tenant_numeric_code ?? "",
  );

  await sequenceConfigurationRepo.upsertIdentifier(
    tenantId,
    identifierType,
    override,
    actorId,
  );

  const effective = resolveEffectiveIdentifier(identifierType, {
    [identifierType]: override,
  });

  return {
    identifier_type: identifierType,
    is_custom: true,
    format_code: effective.format_code,
    segments: effective.segments,
  };
}
