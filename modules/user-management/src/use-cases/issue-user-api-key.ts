import {
  generateUserApiKeySecret,
  hashTenantApiKeySecret,
} from "@hims/ts-sdk-api-key";
import type { UserRepository } from "../ports/index.js";

export type IssueUserApiKeyResult = {
  api_key_prefix: string;
  /** Plaintext secret — returned once at issuance only. */
  api_key_secret: string;
};

export async function issueUserApiKey(
  userRepository: UserRepository,
  tenantId: string,
  userId: string,
  environment: "live" | "test" = "live",
): Promise<IssueUserApiKeyResult> {
  const { secret, prefix } = generateUserApiKeySecret(environment);
  const keyHash = hashTenantApiKeySecret(secret);
  await userRepository.saveUserApiKey(tenantId, userId, prefix, keyHash);
  return { api_key_prefix: prefix, api_key_secret: secret };
}
