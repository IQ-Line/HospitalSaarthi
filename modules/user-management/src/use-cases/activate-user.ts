import type { User } from "../ports/index.js";
import type { UpdateUserContext, UpdateUserDeps } from "./update-user.js";
import { updateUser } from "./update-user.js";

export type ActivateUserDeps = UpdateUserDeps;

/**
 * Sets the platform user to `active` (reverses soft deactivate). Uses {@link updateUser} so
 * `user-management.user.updated` events match PATCH semantics.
 *
 * Cerbos: dedicated `POST /users/{id}/activate` → `user.activate` (paired with `user.deactivate`).
 */
export async function activateUser(
  deps: ActivateUserDeps,
  ctx: UpdateUserContext,
  userId: string,
): Promise<User | null> {
  const previous = await deps.userRepository.getUserById(ctx.tenantId, userId);
  if (previous === null) {
    return null;
  }
  if (previous.status === "active") {
    return previous;
  }
  return updateUser(deps, ctx, userId, { status: "active" });
}
