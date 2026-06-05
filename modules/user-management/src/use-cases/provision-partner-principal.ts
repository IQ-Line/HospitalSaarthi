import { ValidationError } from "../domain/errors.js";
import { isUuid } from "../domain/uuid.js";
import type { PartnerPrincipal, ProvisionPartnerPrincipalInput } from "../domain/types.js";
import type {
  CapabilityRepository,
  MasterDataModuleCatalogPort,
  TenantModuleEntitlementPort,
} from "../ports/index.js";
import type { PartnerPrincipalRepository } from "../ports/partner-principal-repository.js";
import type { ModuleEntitlementRequestContext } from "../ports/module-integration-ports.js";
import { assertRuntimeCapabilityKeysEntitledForTenant } from "./assert-runtime-capability-keys-entitled-for-tenant.js";

export type ProvisionPartnerPrincipalDeps = {
  partnerPrincipalRepository: PartnerPrincipalRepository;
  capabilityRepository: CapabilityRepository;
  tenantModuleEntitlementPort: TenantModuleEntitlementPort;
  masterDataModuleCatalogPort: MasterDataModuleCatalogPort;
};

export type ProvisionPartnerPrincipalContext = {
  tenantId: string;
  actorId: string;
};

function resolveSuggestedCapabilityKeys(input: ProvisionPartnerPrincipalInput): string[] {
  if (Array.isArray(input.suggested_capability_keys) && input.suggested_capability_keys.length > 0) {
    return input.suggested_capability_keys;
  }
  return [];
}

export async function provisionPartnerPrincipal(
  deps: ProvisionPartnerPrincipalDeps,
  ctx: ProvisionPartnerPrincipalContext,
  input: ProvisionPartnerPrincipalInput,
  entitlementContext?: ModuleEntitlementRequestContext,
): Promise<PartnerPrincipal> {
  const integrationId = input.integration_id?.trim() ?? "";
  if (!isUuid(integrationId)) {
    throw new ValidationError("partner_integration_id_invalid");
  }

  const displayName = input.integration_display_name?.trim() ?? "";
  if (displayName.length === 0) {
    throw new ValidationError("partner_display_name_empty");
  }

  const suggestedKeys = resolveSuggestedCapabilityKeys(input);
  if (suggestedKeys.length === 0) {
    throw new ValidationError("partner_capability_keys_invalid");
  }

  const capabilityIds = await assertRuntimeCapabilityKeysEntitledForTenant(
    {
      capabilityRepository: deps.capabilityRepository,
      tenantModuleEntitlementPort: deps.tenantModuleEntitlementPort,
      masterDataModuleCatalogPort: deps.masterDataModuleCatalogPort,
    },
    ctx.tenantId,
    suggestedKeys,
    entitlementContext,
  );

  return deps.partnerPrincipalRepository.provisionPartnerPrincipal(ctx.tenantId, {
    integrationId,
    displayName,
    capabilityIds,
    actorId: ctx.actorId,
  });
}
