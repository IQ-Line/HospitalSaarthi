import type { AccessTokenIssuerPort } from "../ports/index.js";

export function createAccessTokenIssuerStub(
  token = "test-access-token",
  refreshToken = "test-refresh-token",
): AccessTokenIssuerPort {
  return {
    async issueForPlatformUser() {
      return {
        access_token: token,
        token_type: "Bearer",
        expires_in: 300,
        refresh_token: refreshToken,
        refresh_expires_in: 604_800,
      };
    },
  };
}
