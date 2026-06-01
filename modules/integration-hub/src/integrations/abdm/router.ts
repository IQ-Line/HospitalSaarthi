import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import type { IntegrationHubSharedInfra } from "../../lib/build-abdm-deps.js";
import { integrationContextResolver } from "../../lib/integration-context-resolver.js";
import {
  registerM0Routes,
  registerM1Routes,
  registerM2PlatformRoutes,
  registerM3PlatformRoutes,
} from "./rest-handlers/index.js";

export type AbdmAdapterRouterOptions = IntegrationHubSharedInfra;

async function abdmAdapterRouter(
  app: FastifyInstance,
  sharedInfra: IntegrationHubSharedInfra,
): Promise<void> {
  await app.register(integrationContextResolver(sharedInfra));
  await registerM0Routes(app);
  await registerM1Routes(app);
  await registerM2PlatformRoutes(app);
  await registerM3PlatformRoutes(app);
}

export function createRouter(sharedInfra: IntegrationHubSharedInfra) {
  return fp(
    async (app: FastifyInstance) => abdmAdapterRouter(app, sharedInfra),
    { fastify: "5.x", name: "@hims/integration-hub-abdm-router" },
  );
}
