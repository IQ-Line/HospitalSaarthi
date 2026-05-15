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
export {
  HttpGatewayClient,
  type HttpGatewayClientConfig,
  type NhaGatewaySessionRequestBody,
  type NhaGatewaySessionResponseBody,
} from "./data-access/gateway-client.http.js";
export { EnvSecretsClient } from "./data-access/env-secrets.client.js";
export { FideliusEncryptorStub } from "./data-access/fidelius.js";
export { AbdmGatewayError, parseNhaErrorBody } from "./lib/gateway-errors.js";
export { AbdmUseCaseError } from "./lib/m1-errors.js";
