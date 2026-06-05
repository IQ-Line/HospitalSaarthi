import { assertLoginablePlatformUser } from "../domain/assert-loginable-platform-user.js";
import {
  CapabilityNotFoundError,
  UserNotFoundError,
  ValidationError,
} from "../domain/errors.js";
import { isUuid } from "../domain/uuid.js";
import {
  RUNTIME_AUTH_LIMITS,
  assertWithinLimit,
  dedupeTrimmedIds,
} from "../domain/runtime-authorization-limits.js";
import type {
  CapabilityRepository,
  MasterDataModuleCatalogPort,
  ReplaceUserCapabilitiesInput,
  TenantModuleEntitlementPort,
  UserAccessRepository,
  UserCapabilitiesSnapshot,
  UserRepository,
} from "../ports/index.js";
import type { ModuleEntitlementRequestContext } from "../ports/module-integration-ports.js";
import { assertRuntimeCapabilitiesEntitledForTenant } from "./assert-runtime-capabilities-entitled-for-tenant.js";
import { getUserCapabilities } from "./get-user-capabilities.js";

export type ReplaceUserCapabilitiesDeps = {
  userRepository: UserRepository;
  capabilityRepository: CapabilityRepository;
  userAccessRepository: UserAccessRepository;
  tenantModuleEntitlementPort: TenantModuleEntitlementPort;
  masterDataModuleCatalogPort: MasterDataModuleCatalogPort;
};

export type ReplaceUserCapabilitiesContext = {
  tenantId: string;
  actorId: string;
  correlationId: string;
};

export async function replaceUserCapabilities(
  deps: ReplaceUserCapabilitiesDeps,
  ctx: ReplaceUserCapabilitiesContext,
  userId: string,
  input: ReplaceUserCapabilitiesInput,
  entitlementContext?: ModuleEntitlementRequestContext,
): Promise<UserCapabilitiesSnapshot> {
  const user = await deps.userRepository.getUserById(ctx.tenantId, userId);
  if (user === null) {
    throw new UserNotFoundError(userId);
  }
  assertLoginablePlatformUser(user);

  if (
    !Array.isArray(input.capability_ids) ||
    input.capability_ids.some((capabilityId) => typeof capabilityId !== "string" || !isUuid(capabilityId))
  ) {
    throw new ValidationError("replace_user_capabilities_invalid");
  }

  const capabilityIds = dedupeTrimmedIds(input.capability_ids);
  assertWithinLimit(
    capabilityIds.length,
    RUNTIME_AUTH_LIMITS.maxCapabilityIdsPerRequest,
    "replace_user_capabilities_limit_exceeded",
  );

  if (capabilityIds.length > 0) {
    const capabilities = await deps.capabilityRepository.listCapabilitiesByIds(capabilityIds);
    if (capabilities.length !== capabilityIds.length) {
      const foundIds = new Set(capabilities.map((capability) => capability.id));
      const missingCapabilityId = capabilityIds.find((capabilityId) => !foundIds.has(capabilityId));
      throw new CapabilityNotFoundError(missingCapabilityId);
    }

    await assertRuntimeCapabilitiesEntitledForTenant(
      {
        capabilityRepository: deps.capabilityRepository,
        tenantModuleEntitlementPort: deps.tenantModuleEntitlementPort,
        masterDataModuleCatalogPort: deps.masterDataModuleCatalogPort,
      },
      ctx.tenantId,
      capabilityIds,
      { cachePolicy: "bypass-cache", authorization: entitlementContext?.authorization },
    );
  }

  await deps.userAccessRepository.replaceManualCapabilityGrants(ctx.tenantId, {
    userId,
    capabilityIds,
    actorId: ctx.actorId,
  });

  return getUserCapabilities(
    {
      userRepository: deps.userRepository,
      userAccessRepository: deps.userAccessRepository,
    },
    ctx.tenantId,
    userId,
  );
}
