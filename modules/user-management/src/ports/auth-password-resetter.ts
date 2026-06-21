/**
 * Sets a platform user's better-auth credential password (admin recovery Flow A, authn spec §3.5).
 *
 * Mirrors {@link AuthSessionRevokerPort}: a focused, provider-agnostic slice of the AuthN
 * replaceability boundary (spec §10) so the module use-case never touches better-auth directly.
 * The adapter resolves the better-auth user id from the platform user id and re-hashes the
 * password with the provider's hasher.
 */
export interface AuthPasswordResetterPort {
  setPassword(platformUserId: string, newPassword: string): Promise<void>;
}
