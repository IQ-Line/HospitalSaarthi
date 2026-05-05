import type { CreateUserInput, EventPublisher, User, UserRepository } from "../ports.js";

export type CreateUserDeps = {
  userRepository: UserRepository;
  eventPublisher: EventPublisher;
};

/**
 * Creates a tenant-scoped platform user and emits `user.created` (or equivalent) for consumers.
 */
export async function createUser(
  deps: CreateUserDeps,
  tenantId: string,
  input: CreateUserInput,
): Promise<User> {
  if (typeof input.full_name !== "string" || input.full_name.trim() === "") {
    throw new Error("full_name is required");
  }
  const user = await deps.userRepository.createUser(tenantId, input);
  await deps.eventPublisher.publishUserCreated(tenantId, user);
  return user;
}
