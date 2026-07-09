import {
  CapabilityNotFoundError,
  UserNotFoundError,
  ValidationError,
  type ValidationIssue,
} from "../domain/errors.js";
import {
  RUNTIME_AUTH_LIMITS,
  assertWithinLimit,
} from "../domain/runtime-authorization-limits.js";
import type {
  CapabilityOverrideInput,
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
import { resolveGrantActorIdForTenant } from "./resolve-grant-actor-id-for-tenant.js";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

/**
 * Validates one override list (grant or deny) into deduped, capability-id-keyed entries. Each entry
 * must carry a UUID `capability_id` and an optional string `reason`. Deduped by capability_id
 * (last wins for `reason`).
 */
function normalizeOverrideList(
  value: unknown,
  issue: ValidationIssue,
): CapabilityOverrideInput[] {
  if (!Array.isArray(value)) {
    throw new ValidationError(issue);
  }
  const byCapabilityId = new Map<string, CapabilityOverrideInput>();
  for (const entry of value) {
    if (typeof entry !== "object" || entry === null) {
      throw new ValidationError(issue);
    }
    const { capability_id: capabilityId, reason } = entry as {
      capability_id?: unknown;
      reason?: unknown;
    };
    if (typeof capabilityId !== "string" || !UUID_RE.test(capabilityId.trim())) {
      throw new ValidationError(issue);
    }
    if (reason !== undefined && reason !== null && typeof reason !== "string") {
      throw new ValidationError(issue);
    }
    byCapabilityId.set(capabilityId.trim(), {
      capability_id: capabilityId.trim(),
      reason: typeof reason === "string" ? reason : null,
    });
  }
  return [...byCapabilityId.values()];
}

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

  const grants = normalizeOverrideList(input.grant_overrides, "replace_user_capabilities_invalid");
  const denies = normalizeOverrideList(input.deny_overrides, "replace_user_capabilities_invalid");

  const grantIds = grants.map((override) => override.capability_id);
  const denyIds = denies.map((override) => override.capability_id);
  // All referenced ids (grants and denies) count toward the per-request limit.
  const allReferencedIds = [...new Set([...grantIds, ...denyIds])];
  assertWithinLimit(
    allReferencedIds.length,
    RUNTIME_AUTH_LIMITS.maxCapabilityIdsPerRequest,
    "replace_user_capabilities_limit_exceeded",
  );

  if (allReferencedIds.length > 0) {
    const capabilities = await deps.capabilityRepository.listCapabilitiesByIds(allReferencedIds);
    if (capabilities.length !== allReferencedIds.length) {
      const foundIds = new Set(capabilities.map((capability) => capability.id));
      const missingCapabilityId = allReferencedIds.find((capabilityId) => !foundIds.has(capabilityId));
      throw new CapabilityNotFoundError(missingCapabilityId);
    }
  }

  // Only grants can widen access, so only grants are entitlement-gated. A deny is subtractive and
  // always permissible (denying a non-entitled capability is a harmless no-op).
  if (grantIds.length > 0) {
    await assertRuntimeCapabilitiesEntitledForTenant(
      {
        capabilityRepository: deps.capabilityRepository,
        tenantModuleEntitlementPort: deps.tenantModuleEntitlementPort,
        masterDataModuleCatalogPort: deps.masterDataModuleCatalogPort,
      },
      ctx.tenantId,
      grantIds,
      { cachePolicy: "bypass-cache", authorization: entitlementContext?.authorization },
    );
  }

  const grantActorId = await resolveGrantActorIdForTenant(
    deps.userRepository,
    ctx.tenantId,
    ctx.actorId,
  );

  await deps.userAccessRepository.replaceCapabilityOverrides(ctx.tenantId, {
    userId,
    grants,
    denies,
    actorId: grantActorId,
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
