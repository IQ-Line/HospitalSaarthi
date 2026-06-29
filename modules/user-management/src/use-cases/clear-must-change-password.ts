import { UserNotFoundError } from "../domain/errors.js";
import type { GetUserDeps } from "./get-user.js";
import { getUserById } from "./get-user.js";
import type { UpdateUserContext, UpdateUserDeps } from "./update-user.js";
import { updateUser } from "./update-user.js";

export type ClearMustChangePasswordDeps = UpdateUserDeps;

/**
 * Clears `must_change_password` after the user has set a new password via better-auth.
 */
export async function clearMustChangePassword(
  deps: ClearMustChangePasswordDeps,
  ctx: UpdateUserContext,
  userId: string,
) {
  const user = await getUserById({ userRepository: deps.userRepository }, ctx.tenantId, userId);
  if (user === null) {
    throw new UserNotFoundError(userId);
  }
  if (user.must_change_password !== true) {
    return user;
  }
  const updated = await updateUser(deps, ctx, userId, { must_change_password: false });
  if (updated === null) {
    throw new UserNotFoundError(userId);
  }
  return updated;
}

export type { GetUserDeps };
