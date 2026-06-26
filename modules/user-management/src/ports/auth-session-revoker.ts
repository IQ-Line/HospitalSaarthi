/** Revokes better-auth cookie sessions when a platform user is deactivated. */
export interface AuthSessionRevokerPort {
  revokeAllSessionsForPlatformUser(platformUserId: string): Promise<void>;
}
