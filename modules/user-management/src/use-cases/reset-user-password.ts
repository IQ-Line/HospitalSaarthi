import type { AuthPasswordAdminPort } from "../ports/auth-password-admin.js";
import { UserNotFoundError, ValidationError } from "../domain/errors.js";
import type { AuthSessionRevokerPort } from "../ports/auth-session-revoker.js";
import type { UpdateUserContext, UpdateUserDeps } from "./update-user.js";
import { updateUser } from "./update-user.js";

export type ResetUserPasswordInput = {
  password: string;
};

export type ResetUserPasswordDeps = UpdateUserDeps & {
  authPasswordAdmin: AuthPasswordAdminPort;
  authSessionRevoker?: AuthSessionRevokerPort;
};

/**
 * Admin sets a temporary password, revokes sessions, and flags must_change_password.
 * Cerbos: `POST /users/{id}/reset-password` → `user.update`.
 */
export async function resetUserPassword(
  deps: ResetUserPasswordDeps,
  ctx: UpdateUserContext,
  userId: string,
  input: ResetUserPasswordInput,
) {
  if (typeof input.password !== "string") {
    throw new ValidationError("password_invalid_type");
  }
  if (input.password.trim() === "") {
    throw new ValidationError("password_required");
  }
  if (input.password.length < 8) {
    throw new ValidationError("password_too_short");
  }

  const user = await deps.userRepository.getUserById(ctx.tenantId, userId);
  if (user === null) {
    throw new UserNotFoundError(userId);
  }

  const authUserId = user.auth_user_id?.trim();
  if (authUserId === undefined || authUserId === "") {
    throw new ValidationError("auth_user_not_linked");
  }

  await deps.authPasswordAdmin.setUserPassword(authUserId, input.password);
  await deps.authPasswordAdmin.revokeUserSessions(authUserId);
  await deps.authSessionRevoker?.revokeAllSessionsForPlatformUser(userId);

  const updated = await updateUser(deps, ctx, userId, { must_change_password: true });
  if (updated === null) {
    throw new UserNotFoundError(userId);
  }
  return updated;
}
