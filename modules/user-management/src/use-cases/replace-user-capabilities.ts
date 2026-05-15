import {
  CapabilityNotFoundError,
  UserNotFoundError,
  ValidationError,
} from "../domain/errors.js";
import type {
  CapabilityRepository,
  ReplaceUserCapabilitiesInput,
  UserAccessRepository,
  UserCapabilitiesSnapshot,
  UserRepository,
} from "../ports/index.js";
import { getUserCapabilities } from "./get-user-capabilities.js";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ReplaceUserCapabilitiesDeps = {
  userRepository: UserRepository;
  capabilityRepository: CapabilityRepository;
  userAccessRepository: UserAccessRepository;
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
): Promise<UserCapabilitiesSnapshot> {
  const user = await deps.userRepository.getUserById(ctx.tenantId, userId);
  if (user === null) {
    throw new UserNotFoundError(userId);
  }

  if (
    !Array.isArray(input.capability_ids) ||
    input.capability_ids.some((capabilityId) => typeof capabilityId !== "string" || !UUID_RE.test(capabilityId))
  ) {
    throw new ValidationError("replace_user_capabilities_invalid");
  }

  const capabilityIds = [...new Set(input.capability_ids.map((capabilityId) => capabilityId.trim()))];
  if (capabilityIds.length > 0) {
    const capabilities = await deps.capabilityRepository.listCapabilitiesByIds(capabilityIds);
    if (capabilities.length !== capabilityIds.length) {
      const foundIds = new Set(capabilities.map((capability) => capability.id));
      const missingCapabilityId = capabilityIds.find((capabilityId) => !foundIds.has(capabilityId));
      throw new CapabilityNotFoundError(missingCapabilityId);
    }
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
