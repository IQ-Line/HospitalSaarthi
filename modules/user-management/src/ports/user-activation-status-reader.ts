import type { UserActivationFacts } from "../domain/user-activation.js";

/**
 * Reads the raw activation facts (platform status + better-auth ban) for one platform
 * user. Backs the internal `GET /internal/users/:userId/active` route the BFF edge calls
 * (per authenticated request, cached) to enforce the D13 ban/revocation cutoff WITHIN a
 * live access token's remaining TTL.
 */
export interface UserActivationStatusReaderPort {
  /** Returns the user's activation facts, or `null` when no such user exists in the tenant. */
  getActivationFacts(tenantId: string, userId: string): Promise<UserActivationFacts | null>;
}
