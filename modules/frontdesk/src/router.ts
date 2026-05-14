import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";

export interface FrontdeskRouterOptions {
  /** Reserved for future repos, event bus, and other injected dependencies. */
}

async function frontdeskRouter(
  app: FastifyInstance,
  _options: FrontdeskRouterOptions,
): Promise<void> {
  await Promise.resolve();
  void app;
  void _options;
}

export function createRouter(options: FrontdeskRouterOptions) {
  return fp(
    async (app: FastifyInstance) => frontdeskRouter(app, options),
    { fastify: "5.x", name: "@hims/frontdesk" },
  );
}
