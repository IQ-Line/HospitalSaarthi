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
 * Registers platform routes with the integration-context `preHandler` on the **same**
 * Fastify scope. Hook + routes must share one encapsulation context — registering the
 * resolver and routes as sibling `register()` calls leaves routes outside the hook.
 */
export function registerPlatformRoutesWithIntegrationContext(
  sharedInfra: IntegrationHubSharedInfra,
  registerRoutes: (app: FastifyInstance) => Promise<void>,
): (app: FastifyInstance) => Promise<void> {
  return async (app: FastifyInstance): Promise<void> => {
    app.decorate("integrationHubSharedInfra", sharedInfra);
    app.addHook("preHandler", async (request) => {
      const path = request.url.split("?")[0] ?? "";
      if (isBridgeDiscoveryPath(path)) {
        return;
      }
      await resolveIntegrationContext(request, sharedInfra);
    });
    await registerRoutes(app);
  };
}

/**
 * @deprecated Use {@link registerPlatformRoutesWithIntegrationContext} and register routes in its callback.
 */
export function integrationContextResolver(sharedInfra: IntegrationHubSharedInfra) {
  return registerPlatformRoutesWithIntegrationContext(sharedInfra, async () => {
    // Deprecated shim: registers no routes of its own.
  });
}

export { IntegrationProfileNotFoundError };
