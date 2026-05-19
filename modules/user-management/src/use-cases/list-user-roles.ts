import { UserNotFoundError } from "../domain/errors.js";
import type {
  AppliedRoleTemplate,
  UserAccessRepository,
  UserRepository,
} from "../ports/index.js";

export type ListUserRolesDeps = {
  userAccessRepository: UserAccessRepository;
  userRepository: UserRepository;
};

export async function listUserRoles(
  deps: ListUserRolesDeps,
  tenantId: string,
  userId: string,
): Promise<AppliedRoleTemplate[]> {
  const user = await deps.userRepository.getUserById(tenantId, userId);
  if (user === null) {
    throw new UserNotFoundError(userId);
  }

  return deps.userAccessRepository.listRoleTemplatesByUser(tenantId, userId);
}
