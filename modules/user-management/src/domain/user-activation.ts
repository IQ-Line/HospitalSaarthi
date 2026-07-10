/**
 * Two INDEPENDENT signals decide whether a platform user may currently operate:
 *  - `user_management.users.status` — platform lifecycle (`active` | `inactive` | `suspended`)
 *  - better-auth `auth.user.banned` / `banExpires` — admin ban (null expiry = permanent)
 *
 * Platform deactivation (status → inactive) and a better-auth admin ban set DIFFERENT
 * columns and neither mirrors the other, so the D13 edge cutoff must consider BOTH: a
 * user is "active" only when the platform status is `active` AND no ban is in force.
 */
export type UserActivationFacts = {
  /** `user_management.users.status` — DB-constrained to active|inactive|suspended. */
  status: string;
  /** better-auth admin-plugin ban flag (false when the user has no linked auth account). */
  banned: boolean;
  /** Ban expiry: null = permanent ban; a time in the past = ban already lapsed. */
  banExpires: Date | null;
  /**
   * `user_management.users.must_change_password` — set true by an admin password reset,
   * cleared by `POST /auth/change-password-complete`. Carried alongside the ban/status
   * facts because the SAME users row read supplies it; the internal status endpoint
   * surfaces it so the BFF edge can force the password change server-side (mirroring the
   * D13 ban cutoff). {@link computeUserActive} does NOT consume it — a must-change user is
   * still "active" (their session is valid); they are merely restricted to the
   * password-change path. Optional so the pure ban/status callers need not supply it.
   */
  mustChangePassword?: boolean;
};

/**
 * True only when the platform status is `active` and no ban is currently in force.
 *
 * Ban-expiry boundary: a ban is "in force" while `now < banExpires`. At the exact
 * expiry instant (`now === banExpires`) the ban is treated as lapsed (user active),
 * matching better-auth's own `banExpires` comparison.
 */
export function computeUserActive(facts: UserActivationFacts, now: Date): boolean {
  const statusActive = facts.status === "active";
  const banInForce =
    facts.banned && (facts.banExpires === null || facts.banExpires.getTime() > now.getTime());
  return statusActive && !banInForce;
}
