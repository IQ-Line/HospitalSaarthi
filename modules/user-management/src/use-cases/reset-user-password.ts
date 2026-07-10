import { assertValidPassword } from "../domain/validate-password.js";
import type { AuthPasswordResetterPort } from "../ports/auth-password-resetter.js";
import type { AuthSessionRevokerPort } from "../ports/auth-session-revoker.js";
import type { User, UserRepository } from "../ports/index.js";

export type ResetUserPasswordDeps = {
  userRepository: UserRepository;
  authPasswordResetter: AuthPasswordResetterPort;
  authSessionRevoker: AuthSessionRevokerPort;
};

export type ResetUserPasswordContext = {
  tenantId: string;
  actorId: string;
  correlationId: string;
};

/** POST /users/{id}/reset-password body. */
export type ResetUserPasswordInput = {
  new_password: string;
};

/**
 * Admin recovery Flow A (authn spec §3.5): set a new password for a tenant user's login account
 * and revoke their existing sessions. Authorization (Cerbos `user.reset_password`) is enforced at
 * the HTTP boundary before this runs. Returns null when the user does not exist (handler → 404).
 *
 * Session revocation is mandatory here (spec §15.8): the admin set-password path does NOT revoke
 * sessions on its own. NOTE: §15.10 (prefer `auth.api.*` over direct SQL for revocation) is a known
 * deferred deviation — the injected revoker deletes session rows directly today; it is revisited
 * with the Cerbos / BFF-Token-Handler passes. We reuse the existing port rather than deepen it.
 *
 * The user's `must_change_password` flag is set true so the next interactive login forces a
 * self-chosen password (the recovery credential the admin set is a one-time handoff). Enforcement
 * of that flag at login/gating is a later wave; here we only make the data true.
 */
export async function resetUserPassword(
  deps: ResetUserPasswordDeps,
  ctx: ResetUserPasswordContext,
  userId: string,
  input: ResetUserPasswordInput,
): Promise<User | null> {
  assertValidPassword(input.new_password);

  const user = await deps.userRepository.getUserById(ctx.tenantId, userId);
  if (user === null) {
    return null;
  }

  // Revoke first, then set the new password: this narrows the window in which an old (possibly
  // compromised) session coexists with the freshly-set credential. Each step is idempotent, so the
  // ordering is a hardening, not a correctness dependency.
  await deps.authSessionRevoker.revokeAllSessionsForPlatformUser(userId);
  await deps.authPasswordResetter.setPassword(userId, input.new_password);

  const updated = await deps.userRepository.updateUser(ctx.tenantId, userId, {
    must_change_password: true,
  });

  return updated ?? { ...user, must_change_password: true };
}
