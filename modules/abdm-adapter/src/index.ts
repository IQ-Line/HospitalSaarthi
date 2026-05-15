export { createRouter } from "./router.js";
export type { AbdmAdapterRouterOptions } from "./router.js";

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
} from "./ports.js";
