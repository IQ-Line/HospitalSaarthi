import {
  extractUserApiKeyPrefix,
  isUserApiKeySecret,
  verifyTenantApiKeySecret,
} from "@hims/ts-sdk-api-key";
import { ApiKeyInvalidError } from "../domain/errors.js";
import type { AccessTokenIssuerPort, UserRepository } from "../ports/index.js";

export type ValidateUserApiKeyResult = {
  access_token: string;
  token_type: "Bearer";
  expires_in: number;
  refresh_token: string;
  refresh_expires_in: number;
};

export type ValidateUserApiKeyDeps = {
  userRepository: UserRepository;
  accessTokenIssuer: AccessTokenIssuerPort;
};

export async function validateUserApiKey(
  deps: ValidateUserApiKeyDeps,
  apiKeySecret: string,
): Promise<ValidateUserApiKeyResult> {
  const secret = apiKeySecret.trim();
  if (!isUserApiKeySecret(secret)) {
    throw new ApiKeyInvalidError();
  }
  const prefix = extractUserApiKeyPrefix(secret);
  if (!prefix) {
    throw new ApiKeyInvalidError();
  }

  const row = await deps.userRepository.findActiveUserByApiKeyPrefix(prefix);
  if (!row || !verifyTenantApiKeySecret(secret, row.api_key_hash)) {
    throw new ApiKeyInvalidError();
  }

  const token = await deps.accessTokenIssuer.issueForPlatformUser(row.id);
  return {
    access_token: token.access_token,
    token_type: token.token_type,
    expires_in: token.expires_in,
    refresh_token: token.refresh_token,
    refresh_expires_in: token.refresh_expires_in,
  };
}
