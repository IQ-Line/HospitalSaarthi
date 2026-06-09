export type {
  IntegrationContext,
  TenantIntegrationProfile,
} from "./lib/integration-context.js";
export {
  createSecretsClientFromProfile,
  ProfileSecretsClient,
  PROFILE_CLIENT_ID_REF,
  PROFILE_CLIENT_SECRET_REF,
} from "./lib/per-tenant-secrets.js";
export type { IntegrationProfileRepo } from "./lib/integration-profile-repo.js";
export {
  NotImplementedIntegrationProfileRepo,
} from "./lib/integration-profile-repo.js";
export {
  ConfiguratorHttpIntegrationProfileRepo,
} from "./lib/configurator-http-integration-profile-repo.js";
export {
  buildAbdmDepsForTenant,
  mapConfiguratorProfileRow,
  type IntegrationHubSharedInfra,
  type IntegrationHubDeploymentConfig,
} from "./lib/build-abdm-deps.js";
export { getAbdmDeps } from "./lib/get-abdm-deps.js";
export {
  integrationContextResolver,
  IntegrationTenantRequiredError,
} from "./lib/integration-context-resolver.js";
export {
  IntegrationProfileNotFoundError,
  IntegrationContextMissingError,
} from "./lib/integration-hub-errors.js";

export { enrolAadhaarOtpRequest } from "./integrations/abdm/use-cases/index.js";
export {
  encryptLoginIdWithAbdmPublicKey,
  publicKeyFingerprint,
} from "./integrations/abdm/lib/rsa-abdm-login-id.js";
export {
  createRouter,
  type AbdmAdapterRouterOptions,
} from "./integrations/abdm/router.js";

export { ABDM_ADAPTER_MODULE_KEY } from "./integrations/abdm/domain/abdm-adapter.types.js";
export { ABDM_ADAPTER_SOURCE_MODULE } from "./integrations/abdm/lib/abdm-adapter-constants.js";
export {
  ABDM_ADAPTER_SCHEMA_NAME,
  INTEGRATION_HUB_SCHEMA_NAME,
} from "./integrations/abdm/schema/tables.js";

export type {
  AbdmSession,
  AbdmFlowKind,
} from "./integrations/abdm/domain/session.js";

export type {
  AbdmSessionsPort,
  GatewayClient,
  FideliusEncryptor,
  SecretsClient,
  AbdmAdapterDeps,
  AbdmGatewayRouteTarget,
} from "./integrations/abdm/ports.js";

export { DrizzleAbdmSessionsRepo } from "./integrations/abdm/data-access/abdm-sessions.repo.js";
export { DrizzleInboundMessagesRepo } from "./integrations/abdm/data-access/abdm-inbound-messages.repo.js";
export { DrizzleLinkTokensRepo } from "./integrations/abdm/data-access/abdm-link-tokens.repo.js";
export { DrizzleConsentArtefactsRepo } from "./integrations/abdm/data-access/abdm-consent-artefacts.repo.js";
export {
  HttpGatewayClient,
  type HttpGatewayClientConfig,
  type NhaGatewaySessionRequestBody,
  type NhaGatewaySessionResponseBody,
} from "./integrations/abdm/data-access/gateway-client.http.js";
export {
  HttpEmpiClient,
  NoOpEmpiClient,
} from "./integrations/abdm/data-access/empi-client.http.js";
export {
  HttpRegistrationClient,
  NoOpRegistrationClient,
} from "./integrations/abdm/data-access/registration-client.http.js";
export {
  HttpRecordFoundationClient,
  NoOpRecordFoundationClient,
} from "./integrations/abdm/data-access/record-foundation-client.http.js";
export {
  MockEmpiClient,
  MockRecordFoundationClient,
} from "./integrations/abdm/data-access/mock-platform-clients.js";
export { EnvSecretsClient } from "./integrations/abdm/data-access/env-secrets.client.js";
export {
  FideliusEncryptor,
  createFideliusEncryptorFromEnv,
} from "./integrations/abdm/data-access/fidelius.js";
export { DrizzleLinkOtpsRepo } from "./integrations/abdm/data-access/abdm-link-otps.repo.js";
export { createPayloadEncryptorFromEnv } from "./integrations/abdm/lib/payload-encryptor.js";
export {
  registerM2CallbackRoutes,
  registerM2PlatformRoutes,
} from "./integrations/abdm/rest-handlers/m2/index.js";
export {
  registerM3CallbackRoutes,
  registerM3PlatformRoutes,
} from "./integrations/abdm/rest-handlers/m3/index.js";
export { DrizzleM3ConsentRequestsRepo } from "./integrations/abdm/data-access/abdm-m3-consent-requests.repo.js";
export { DrizzleM3ConsentArtefactsHiuRepo } from "./integrations/abdm/data-access/abdm-m3-consent-artefacts-hiu.repo.js";
export { DrizzleM3DataTransfersRepo } from "./integrations/abdm/data-access/abdm-m3-data-transfers.repo.js";
export { registerM2EventConsumers } from "./integrations/abdm/events/register-m2-consumers.js";
export {
  HttpHipDataPushClient,
  createHipDataPushClientFromEnv,
} from "./integrations/abdm/data-access/hip-data-push.client.js";
export {
  InMemoryLinkOtpStore,
  generateLinkOtp6,
} from "./integrations/abdm/lib/link-otp-store.js";
export {
  createSmsClientFromEnv,
  createSmsClientFromProfile,
  HttpSmsClient,
  LoggingSmsClient,
  NoOpSmsClient,
  TwilioSmsClient,
} from "./integrations/abdm/data-access/sms-client.js";
export { EmpiClientError } from "./integrations/abdm/lib/empi-client-error.js";
export { AbdmGatewayError, parseNhaErrorBody } from "./integrations/abdm/lib/gateway-errors.js";
export { AbdmUseCaseError } from "./integrations/abdm/lib/m1-errors.js";
export {
  requireCallbackSecurityInProd,
  requireSessionTokenCryptoInProd,
} from "./integrations/abdm/lib/session-token-crypto.js";
export { allowInsecureAbdmCallbacks, nodeEnv } from "./integrations/abdm/lib/abdm-runtime-env.js";
export {
  runIntegrationHubJanitor,
  scheduleIntegrationHubJanitor,
} from "./workers/janitor.js";
export {
  resolveCallbackTenant,
  resolveCallbackTenantId,
  resolveInboundRequestId,
  type ResolvedCallbackTenant,
} from "./integrations/abdm/lib/resolve-callback-tenant.js";
export type { BuildAbdmDepsOptions } from "./lib/build-abdm-deps.js";
