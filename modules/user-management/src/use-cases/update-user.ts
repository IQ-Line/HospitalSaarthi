import type { UpdateUserInput, User, UserRepository } from "../ports/index.js";

export type UpdateUserDeps = {
  userRepository: UserRepository;
};

export async function updateUser(
  deps: UpdateUserDeps,
  tenantId: string,
  userId: string,
  input: UpdateUserInput,
): Promise<User | null> {
  return deps.userRepository.updateUser(tenantId, userId, input);
}
