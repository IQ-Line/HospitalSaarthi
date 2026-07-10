/**
 * better-auth identity anchor: a synthetic, non-routable email derived from the username.
 *
 * Security Invariant §15.1 (authn spec): `ba_users.email` is NEVER a real/contact email — it
 * lives entirely inside the better-auth replaceability boundary (spec §10.2). The real contact
 * email lives only on the platform `users.email`. This module is the SINGLE source of the
 * `@auth.internal` pattern: the synthetic-collision → DuplicateUsername mapping and the §15.1
 * invariant both depend on every caller deriving the value here, not inlining the literal.
 */
export const SYNTHETIC_AUTH_EMAIL_DOMAIN = "auth.internal";

export function toSyntheticAuthEmail(username: string): string {
  return `${username.trim().toLowerCase()}@${SYNTHETIC_AUTH_EMAIL_DOMAIN}`;
}
