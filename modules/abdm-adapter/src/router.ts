import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import type { AbdmAdapterDeps } from "./ports.js";

export interface AbdmAdapterRouterOptions extends AbdmAdapterDeps {
  /** Reserved for milestone-scoped feature flags (e.g., disable M2 callbacks in sandbox). */
}

async function abdmAdapterRouter(
  app: FastifyInstance,
  options: AbdmAdapterRouterOptions,
): Promise<void> {
  await Promise.resolve();
  void app;
  void options;
  // TODO: mount M1 REST handlers under `/m1`, M2 callback handlers under `/m2`,
  // M3 handlers under `/m3`. Each handler reads deps from `options` and
  // delegates to use-case functions in `./use-cases/`.
}

export function createRouter(options: AbdmAdapterRouterOptions) {
  return fp(
    async (app: FastifyInstance) => abdmAdapterRouter(app, options),
    { fastify: "5.x", name: "@hims/abdm-adapter" },
  );
}
