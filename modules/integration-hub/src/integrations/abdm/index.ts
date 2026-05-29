export { enrolAadhaarOtpRequest } from "./use-cases/index.js";
export { encryptLoginIdWithAbdmPublicKey, publicKeyFingerprint } from "./lib/rsa-abdm-login-id.js";
export { createRouter, type AbdmAdapterRouterOptions } from "./router.js";

export { ABDM_ADAPTER_MODULE_KEY } from "./domain/abdm-adapter.types.js";
export { ABDM_ADAPTER_SOURCE_MODULE } from "./lib/abdm-adapter-constants.js";
export { ABDM_ADAPTER_SCHEMA_NAME } from "./schema/tables.js";

export type {
  AbdmSession,
  AbdmFlowKind,
} from "./domain/session.js";

export type {
  AbdmSessionsPort,
  GatewayClient,
  FideliusEncryptor,
  SecretsClient,
  AbdmAdapterDeps,
  AbdmGatewayRouteTarget,
} from "./ports.js";

export { DrizzleAbdmSessionsRepo } from "./data-access/abdm-sessions.repo.js";
export { DrizzleInboundMessagesRepo } from "./data-access/abdm-inbound-messages.repo.js";
export { DrizzleLinkTokensRepo } from "./data-access/abdm-link-tokens.repo.js";
export { DrizzleConsentArtefactsRepo } from "./data-access/abdm-consent-artefacts.repo.js";
export {
  HttpGatewayClient,
  type HttpGatewayClientConfig,
  type NhaGatewaySessionRequestBody,
  type NhaGatewaySessionResponseBody,
} from "./data-access/gateway-client.http.js";
export {
  HttpEmpiClient,
  NoOpEmpiClient,
} from "./data-access/empi-client.http.js";
export {
  HttpRecordFoundationClient,
  NoOpRecordFoundationClient,
} from "./data-access/record-foundation-client.http.js";
export {
  MockEmpiClient,
  MockRecordFoundationClient,
} from "./data-access/mock-platform-clients.js";
export { EnvSecretsClient } from "./data-access/env-secrets.client.js";
export {
  FideliusEncryptor,
  createFideliusEncryptorFromEnv,
} from "./data-access/fidelius.js";
export { DrizzleLinkOtpsRepo } from "./data-access/abdm-link-otps.repo.js";
export { createPayloadEncryptorFromEnv } from "./lib/payload-encryptor.js";
export {
  registerM2CallbackRoutes,
  registerM2PlatformRoutes,
} from "./rest-handlers/m2/index.js";
export {
  registerM3CallbackRoutes,
  registerM3PlatformRoutes,
} from "./rest-handlers/m3/index.js";
export { DrizzleM3ConsentRequestsRepo } from "./data-access/abdm-m3-consent-requests.repo.js";
export { DrizzleM3ConsentArtefactsHiuRepo } from "./data-access/abdm-m3-consent-artefacts-hiu.repo.js";
export { DrizzleM3DataTransfersRepo } from "./data-access/abdm-m3-data-transfers.repo.js";
export { registerM2EventConsumers } from "./events/register-m2-consumers.js";
export {
  HttpHipDataPushClient,
  createHipDataPushClientFromEnv,
} from "./data-access/hip-data-push.client.js";
export { InMemoryLinkOtpStore, generateLinkOtp6 } from "./lib/link-otp-store.js";
export {
  createSmsClientFromEnv,
  HttpSmsClient,
  LoggingSmsClient,
  NoOpSmsClient,
  TwilioSmsClient,
} from "./data-access/sms-client.js";
export { EmpiClientError } from "./lib/empi-client-error.js";
export { AbdmGatewayError, parseNhaErrorBody } from "./lib/gateway-errors.js";
export { AbdmUseCaseError } from "./lib/m1-errors.js";
export {
  requireCallbackSecurityInProd,
  requireSessionTokenCryptoInProd,
} from "./lib/session-token-crypto.js";
export { allowInsecureAbdmCallbacks, nodeEnv } from "./lib/abdm-runtime-env.js";
