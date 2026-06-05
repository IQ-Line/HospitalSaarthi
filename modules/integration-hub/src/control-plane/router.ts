import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import type { ControlPlaneRouterOptions } from "./control-plane.types.js";
import { registerApiKeysHandler } from "./rest-handlers/api-keys.handler.js";
import { registerIntegrationsHandler } from "./rest-handlers/integrations.handler.js";

async function controlPlaneRouter(
  app: FastifyInstance,
  options: ControlPlaneRouterOptions,
): Promise<void> {
  registerIntegrationsHandler(app, {
    getTenantId: options.getTenantId,
    getActorId: options.getActorId,
    getAuthorizationHeader: options.getAuthorizationHeader,
    createIntegrationDeps: {
      integrationsRepository: options.integrationsRepository,
    },
    activateIntegrationDeps: {
      integrationsRepository: options.integrationsRepository,
      partnerPrincipalGateway: options.partnerPrincipalGateway,
    },
    disableIntegrationDeps: {
      integrationsRepository: options.integrationsRepository,
      partnerPrincipalGateway: options.partnerPrincipalGateway,
    },
    reactivateIntegrationDeps: {
      integrationsRepository: options.integrationsRepository,
      partnerPrincipalGateway: options.partnerPrincipalGateway,
    },
    deleteIntegrationDeps: {
      integrationsRepository: options.integrationsRepository,
      integrationApiKeysRepository: options.integrationApiKeysRepository,
    },
    integrationsRepository: options.integrationsRepository,
  });

  registerApiKeysHandler(app, {
    getTenantId: options.getTenantId,
    getActorId: options.getActorId,
    issueApiKeyDeps: {
      integrationsRepository: options.integrationsRepository,
      integrationApiKeysRepository: options.integrationApiKeysRepository,
    },
    integrationApiKeysRepository: options.integrationApiKeysRepository,
  });
}

export function createControlPlaneRouter(options: ControlPlaneRouterOptions) {
  return fp(
    async (app: FastifyInstance) => controlPlaneRouter(app, options),
    { fastify: "5.x", name: "@hims/integration-hub-control-plane" },
  );
}
