import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import type { IntegrationHubSharedInfra } from "../../lib/build-abdm-deps.js";
import { registerPlatformRoutesWithIntegrationContext } from "../../lib/integration-context-resolver.js";
import {
  registerM0Routes,
  registerM0DiscoveryRoutes,
  registerM1Routes,
  registerM2PlatformRoutes,
  registerM3PlatformRoutes,
  registerScanShareRoutes,
} from "./rest-handlers/index.js";

export type AbdmAdapterRouterOptions = IntegrationHubSharedInfra;

async function abdmAdapterRouter(
  app: FastifyInstance,
  sharedInfra: IntegrationHubSharedInfra,
): Promise<void> {
  await app.register(async (discovery) => {
    await registerM0DiscoveryRoutes(discovery, sharedInfra);
  });

  await app.register(async (platform) => {
    await platform.register(
      registerPlatformRoutesWithIntegrationContext(sharedInfra, async (scoped) => {
        await registerM0Routes(scoped);
        await registerM1Routes(scoped);
        await registerM2PlatformRoutes(scoped);
        await registerM3PlatformRoutes(scoped);
        await registerScanShareRoutes(scoped);
      }),
    );
  });
}

export function createRouter(sharedInfra: IntegrationHubSharedInfra) {
  return fp(
    async (app: FastifyInstance) => abdmAdapterRouter(app, sharedInfra),
    { fastify: "5.x", name: "@hims/integration-hub-abdm-router" },
  );
}
