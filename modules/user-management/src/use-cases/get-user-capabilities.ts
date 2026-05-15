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

  const [roleTemplates, grants] = await Promise.all([
    deps.userAccessRepository.listRoleTemplatesByUser(tenantId, userId),
    deps.userAccessRepository.listActiveCapabilityGrantsByUser(tenantId, userId),
  ]);

  return {
    direct_grants: grants.filter((grant) => grant.grant_source !== "role_template"),
    copied_grants: grants.filter((grant) => grant.grant_source === "role_template"),
    role_templates: roleTemplates,
  };
}
