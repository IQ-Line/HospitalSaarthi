import type { FastifyInstance, FastifyRequest } from "fastify";
import { buildAbdmDepsForTenant, type IntegrationHubSharedInfra } from "./build-abdm-deps.js";
import { IntegrationProfileNotFoundError } from "./integration-hub-errors.js";
import { isBridgeDiscoveryPath } from "./integration-hub-identity-skip-paths.js";

declare module "fastify" {
  interface FastifyInstance {
    integrationHubSharedInfra?: IntegrationHubSharedInfra;
  }
}

export class IntegrationTenantRequiredError extends Error {
  readonly statusCode = 400;
  readonly code = "TENANT_REQUIRED";

  constructor() {
    super("x-tenant-id is required");
    this.name = "IntegrationTenantRequiredError";
  }
}

async function resolveIntegrationContext(
  request: FastifyRequest,
  sharedInfra: IntegrationHubSharedInfra,
): Promise<void> {
  const tenantId = request.tenantId?.trim();
  if (!tenantId) {
    throw new IntegrationTenantRequiredError();
  }
  request.integrationCtx = await buildAbdmDepsForTenant(tenantId, sharedInfra);
}

/**
 * Loads active ABDM profile and builds per-tenant deps after `tenantPlugin`.
 * Register on platform `/api/abdm/v1` scope only (not `/api/v3` callbacks or M0 discovery).
 *
 * Not wrapped in fastify-plugin — hooks stay encapsulated in the child scope that registers this.
 */
export function integrationContextResolver(sharedInfra: IntegrationHubSharedInfra) {
  return async (app: FastifyInstance): Promise<void> => {
    app.decorate("integrationHubSharedInfra", sharedInfra);
    app.addHook("preHandler", async (request) => {
      const path = request.url.split("?")[0] ?? "";
      if (isBridgeDiscoveryPath(path)) {
        return;
      }
      await resolveIntegrationContext(request, sharedInfra);
    });
  };
}

export { IntegrationProfileNotFoundError };
