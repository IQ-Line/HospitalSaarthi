import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import type { AbdmAdapterDeps } from "./ports.js";
import { registerM0Routes, registerM1Routes } from "./rest-handlers/index.js";

export interface AbdmAdapterRouterOptions extends AbdmAdapterDeps {
  /** Reserved for milestone-scoped feature flags (e.g., disable M2 callbacks in sandbox). */
}

async function abdmAdapterRouter(
  app: FastifyInstance,
  options: AbdmAdapterRouterOptions,
): Promise<void> {
  await registerM0Routes(app, options);
  await registerM1Routes(app, options);
}

export function createRouter(options: AbdmAdapterRouterOptions) {
  return fp(
    async (app: FastifyInstance) => abdmAdapterRouter(app, options),
    { fastify: "5.x", name: "@hims/abdm-adapter" },
  );
}
