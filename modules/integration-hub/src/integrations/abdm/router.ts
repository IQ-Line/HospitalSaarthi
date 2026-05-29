import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import type { AbdmAdapterDeps } from "./ports.js";
import {
  registerM0Routes,
  registerM1Routes,
  registerM2PlatformRoutes,
  registerM3PlatformRoutes,
} from "./rest-handlers/index.js";

export type AbdmAdapterRouterOptions = AbdmAdapterDeps;

async function abdmAdapterRouter(
  app: FastifyInstance,
  options: AbdmAdapterRouterOptions,
): Promise<void> {
  await registerM0Routes(app, options);
  await registerM1Routes(app, options);
  await registerM2PlatformRoutes(app, options);
  await registerM3PlatformRoutes(app, options);
}

export function createRouter(options: AbdmAdapterRouterOptions) {
  return fp(
    async (app: FastifyInstance) => abdmAdapterRouter(app, options),
    { fastify: "5.x", name: "@hims/abdm-adapter" },
  );
}
