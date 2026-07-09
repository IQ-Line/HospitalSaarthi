import { UserNotFoundError } from "../domain/errors.js";
import type {
  UserAccessRepository,
  UserCapabilitiesSnapshot,
  UserRepository,
} from "../ports/index.js";

export type GetUserCapabilitiesDeps = {
  userRepository: UserRepository;
  userAccessRepository: UserAccessRepository;
};

export async function getUserCapabilities(
  deps: GetUserCapabilitiesDeps,
  tenantId: string,
  userId: string,
): Promise<UserCapabilitiesSnapshot> {
  const user = await deps.userRepository.getUserById(tenantId, userId);
  if (user === null) {
    throw new UserNotFoundError(userId);
  }

  const [roleTemplates, overrides] = await Promise.all([
    deps.userAccessRepository.listRoleTemplatesByUser(tenantId, userId),
    deps.userAccessRepository.listActiveCapabilityGrantsByUser(tenantId, userId),
  ]);

  return {
    grant_overrides: overrides.filter((override) => override.effect === "grant"),
    deny_overrides: overrides.filter((override) => override.effect === "deny"),
    role_templates: roleTemplates,
  };
}
