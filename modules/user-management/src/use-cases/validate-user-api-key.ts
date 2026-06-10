import {
  extractUserApiKeyPrefix,
  isUserApiKeySecret,
  verifyTenantApiKeySecret,
} from "@hims/ts-sdk-api-key";
import { ApiKeyInvalidError } from "../domain/errors.js";
import type { Principal, User } from "../domain/types.js";
import type {
  AccessTokenIssuerPort,
  MasterDataModuleCatalogPort,
  PrincipalService,
  TenantModuleEntitlementPort,
  UserRepository,
} from "../ports/index.js";
import { getPrincipal } from "./get-principal.js";

export type ValidateUserApiKeyResult = {
  user: User;
  iq_tenant_id: string;
  principal: Principal;
  /** Enabled module slugs for the tenant (Configurator `tenant_modules`). */
  enabled_module_slugs: string[];
  access_token: string;
  token_type: "Bearer";
  expires_in: number;
  /** better-auth session token for `GET /api/auth/token` without re-sending the API key. */
  refresh_token: string;
  refresh_expires_in: number;
};

export type ValidateUserApiKeyDeps = {
  userRepository: UserRepository;
  principalService: PrincipalService;
  tenantModuleEntitlementPort: TenantModuleEntitlementPort;
  masterDataModuleCatalogPort: MasterDataModuleCatalogPort;
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
  if (!row || row.status !== "active") {
    throw new ApiKeyInvalidError();
  }
  if (!verifyTenantApiKeySecret(secret, row.api_key_hash)) {
    throw new ApiKeyInvalidError();
  }

  const { api_key_hash: _hash, iq_tenant_id, ...user } = row;
  const principal = await getPrincipal(
    { principalService: deps.principalService },
    {
      tenantId: iq_tenant_id,
      userId: user.id,
    },
  );
  const enabledModuleIds = await deps.tenantModuleEntitlementPort.listTenantEnabledModuleIds(
    iq_tenant_id,
  );
  const slugById = await deps.masterDataModuleCatalogPort.resolveModuleSlugsByIds(enabledModuleIds);
  const enabled_module_slugs = enabledModuleIds
    .map((id) => slugById.get(id))
    .filter((slug): slug is string => typeof slug === "string" && slug.length > 0);
  const token = await deps.accessTokenIssuer.issueForPlatformUser(user.id);

  return {
    user,
    iq_tenant_id,
    principal,
    enabled_module_slugs,
    access_token: token.access_token,
    token_type: token.token_type,
    expires_in: token.expires_in,
    refresh_token: token.refresh_token,
    refresh_expires_in: token.refresh_expires_in,
  };
}
