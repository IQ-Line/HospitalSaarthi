export { authzPlugin } from "./plugin.js";
export { createPepMiddleware } from "./middleware.js";
export { DecisionCache } from "./decision-cache.js";
export { getCerbosClient, closeCerbosClient } from "./client.js";
export type {
  AuthzPluginOptions,
  AuthzTarget,
  AuthzTargetResolver,
  ResourceCheck,
  CheckResult,
  PlanResult,
  PepMiddlewareOptions,
} from "./types.js";
