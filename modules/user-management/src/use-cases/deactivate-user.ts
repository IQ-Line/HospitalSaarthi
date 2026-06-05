import { assertLoginablePlatformUser } from "../domain/assert-loginable-platform-user.js";
import type { User } from "../ports/index.js";
import type { UpdateUserContext, UpdateUserDeps } from "./update-user.js";
import { updateUser } from "./update-user.js";

export type DeactivateUserDeps = UpdateUserDeps;

/**
 * Sets the platform user to `inactive` (soft deactivate). Uses {@link updateUser} so
 * `user-management.user.updated` / `user-management.user.deactivated` events match PATCH semantics.
 *
 * Cerbos: prefer dedicated `POST /users/{id}/deactivate` → `user.deactivate`; general profile edits use `user.update`.
 */
export async function deactivateUser(
  deps: DeactivateUserDeps,
  ctx: UpdateUserContext,
  userId: string,
): Promise<User | null> {
  const previous = await deps.userRepository.getUserById(ctx.tenantId, userId);
  if (previous === null) {
    return null;
  }
  assertLoginablePlatformUser(previous);
  if (previous.status === "inactive") {
    return previous;
  }
  return updateUser(deps, ctx, userId, { status: "inactive" });
}
