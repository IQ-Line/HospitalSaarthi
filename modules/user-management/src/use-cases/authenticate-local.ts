import type { SessionRepo } from "../ports.js";
import type { Session } from "../domain/session.types.js";

interface AuthenticateLocalInput {
  username: string;
  password: string;
  ip_address?: string;
  user_agent?: string;
}

interface AuthenticateLocalResult {
  access_token: string;
  refresh_token: string;
  token_type: "Bearer";
  expires_in: number;
}

/**
 * Placeholder for local authentication. The actual credential verification
 * will be delegated to better-auth via `auth.api.signInUsername()`. This
 * function defines the contract and return shape; the real implementation
 * replaces the TODO block below.
 */
export async function authenticateLocal(
  _sessionRepo: SessionRepo,
  _input: AuthenticateLocalInput,
): Promise<AuthenticateLocalResult> {
  // TODO: Replace with better-auth integration:
  // 1. Call auth.api.signInUsername({ body: { username, password } })
  // 2. Receive session + user from better-auth
  // 3. Look up users rows by auth_user_id for tenant picker
  // 4. Issue JWT with platform claims (sub, iq_tenant_id, roles, etc.)
  // 5. Return access_token + refresh_token

  throw new Error("authenticateLocal not yet implemented — requires better-auth integration");
}
