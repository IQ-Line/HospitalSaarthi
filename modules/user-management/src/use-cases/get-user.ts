import type { User, UserRepository } from "../ports/index.js";

export type GetUserDeps = {
  userRepository: UserRepository;
};

export async function getUserById(
  deps: GetUserDeps,
  tenantId: string,
  userId: string,
): Promise<User | null> {
  const user = await deps.userRepository.getUserById(tenantId, userId);
  if (user === null || user.kind === "partner") {
    return null;
  }
  return user;
}
