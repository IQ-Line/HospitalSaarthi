import type { AuthPasswordResetterPort, UserRepository } from "@hims/user-management";
import type { HimsBetterAuthInstance } from "./create-hims-better-auth.js";

type BetterAuthContext = {
  password: { hash(password: string): Promise<string> };
  internalAdapter: { updatePassword(userId: string, hashedPassword: string): Promise<unknown> };
};

/**
 * Better-auth-backed {@link AuthPasswordResetterPort} for admin recovery Flow A (authn spec §3.5).
 *
 * Resolves the better-auth user id from the platform user id (mirroring {@link DrizzleAuthSessionRevoker}),
 * then re-hashes + stores the credential password via better-auth's own context. We use the trusted
 * server-side path (`auth.$context`) rather than `auth.api.setUserPassword`: that admin endpoint is
 * gated by better-auth's `adminMiddleware` + role check (and the instance uses bare `admin()` with no
 * `adminUserIds`), which we deliberately do NOT couple our authorization to — Cerbos
 * (`user.reset_password`) is authoritative and runs before this. This matches the existing
 * "better-auth's own role check is bypassed for trusted server-side calls" stance in
 * create-hims-better-auth.ts. The hash is produced by better-auth's hasher, so the resulting
 * credential verifies identically to a normal sign-in.
 */
export class BetterAuthPasswordResetter implements AuthPasswordResetterPort {
  constructor(
    private readonly auth: HimsBetterAuthInstance,
    private readonly userRepository: UserRepository,
  ) {}

  async setPassword(platformUserId: string, newPassword: string): Promise<void> {
    const trimmed = platformUserId.trim();
    if (trimmed.length === 0) {
      return;
    }

    const row = await this.userRepository.findUserByGlobalId(trimmed);
    const authUserId = row?.auth_user_id?.trim() || row?.id?.trim() || trimmed;

    const ctx = (await (this.auth as unknown as { $context: Promise<unknown> })
      .$context) as BetterAuthContext;
    const hashed = await ctx.password.hash(newPassword);
    await ctx.internalAdapter.updatePassword(authUserId, hashed);
  }
}
