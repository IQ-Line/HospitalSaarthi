import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";

export interface BillingRouterOptions {
  /** Reserved for future repos, event bus, and other injected dependencies. */
}

async function billingRouter(
  app: FastifyInstance,
  _options: BillingRouterOptions,
): Promise<void> {
  await Promise.resolve();
  void app;
  void _options;
}

export function createRouter(options: BillingRouterOptions) {
  return fp(
    async (app: FastifyInstance) => billingRouter(app, options),
    { fastify: "5.x", name: "@hims/billing" },
  );
}
