import type { FastifyInstance, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import { buildAbdmDepsForTenant, type IntegrationHubSharedInfra } from "./build-abdm-deps.js";
import { IntegrationProfileNotFoundError } from "./integration-hub-errors.js";

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
 * Register on platform `/api/abdm/v1` scope only (not `/api/v3` callbacks).
 */
export function integrationContextResolver(sharedInfra: IntegrationHubSharedInfra) {
  return fp(
    async (app: FastifyInstance) => {
      app.decorate("integrationHubSharedInfra", sharedInfra);
      app.addHook("preHandler", async (request) => {
        await resolveIntegrationContext(request, sharedInfra);
      });
    },
    { name: "@hims/integration-hub-context-resolver" },
  );
}

export { IntegrationProfileNotFoundError };
