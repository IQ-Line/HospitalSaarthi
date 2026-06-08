import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import type { DbInstance } from "@hims/ts-sdk-db";
import { DrizzleIntegrationApiKeyRepository } from "./data-access/integration-api-key-repository.js";
import { DrizzleIntegrationRepository } from "./data-access/integration-repository.js";
import { HttpUserManagementPartnerGateway } from "./gateways/http-user-management-partner-gateway.js";
import type { ApiKeyEnvironment } from "./lib/api-key-crypto.js";
import {
  registerIntegrationHandlers,
  type IntegrationHandlersDeps,
} from "./rest-handlers/integration-handlers.js";

export type ControlPlaneRouterOptions = {
  db: DbInstance;
  userManagementUrl: string;
  apiKeyEnvironment?: ApiKeyEnvironment;
  getTenantId: IntegrationHandlersDeps["getTenantId"];
  getActorId: IntegrationHandlersDeps["getActorId"];
  getAuthorization: IntegrationHandlersDeps["getAuthorization"];
};

export function createControlPlaneRouter(options: ControlPlaneRouterOptions) {
  const integrationRepository = new DrizzleIntegrationRepository(options.db);
  const integrationApiKeyRepository = new DrizzleIntegrationApiKeyRepository(options.db);
  const userManagementPartnerGateway = new HttpUserManagementPartnerGateway(
    options.userManagementUrl,
  );
  const apiKeyEnvironment = options.apiKeyEnvironment ?? "test";

  const sharedDeps = {
    integrationRepository,
    integrationApiKeyRepository,
    userManagementPartnerGateway,
  };

  return fp(async (fastify: FastifyInstance) => {
    registerIntegrationHandlers(fastify, {
      getTenantId: options.getTenantId,
      getActorId: options.getActorId,
      getAuthorization: options.getAuthorization,
      createIntegrationDeps: sharedDeps,
      updateIntegrationDeps: sharedDeps,
      getIntegrationDeps: sharedDeps,
      listIntegrationsDeps: sharedDeps,
      deleteIntegrationDeps: sharedDeps,
      activateIntegrationDeps: sharedDeps,
      disableIntegrationDeps: sharedDeps,
      reactivateIntegrationDeps: sharedDeps,
      listApiKeysDeps: sharedDeps,
      issueApiKeyDeps: { ...sharedDeps, apiKeyEnvironment },
      revokeApiKeyDeps: sharedDeps,
    });
  });
}
