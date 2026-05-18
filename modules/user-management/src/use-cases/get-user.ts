import type { User, UserRepository } from "../ports/index.js";

export type GetUserDeps = {
  userRepository: UserRepository;
};

export async function getUserById(
  deps: GetUserDeps,
  tenantId: string,
  userId: string,
): Promise<User | null> {
  return deps.userRepository.getUserById(tenantId, userId);
}
