import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import type { CareContextRepo, BundleRepo } from "./ports.js";
import { registerCareContextHandlers } from "./rest-handlers/care-contexts.js";
import { registerBundleHandlers } from "./rest-handlers/bundles.js";

export interface RecordFoundationRouterOptions {
  careContextRepo: CareContextRepo;
  bundleRepo: BundleRepo;
}

async function recordFoundationRouter(
  app: FastifyInstance,
  options: RecordFoundationRouterOptions,
): Promise<void> {
  registerCareContextHandlers(app, {
    careContextRepo: options.careContextRepo,
  });
  registerBundleHandlers(app, {
    careContextRepo: options.careContextRepo,
    bundleRepo: options.bundleRepo,
  });
}

export function createRouter(options: RecordFoundationRouterOptions) {
  return fp(
    async (app: FastifyInstance) => recordFoundationRouter(app, options),
    { fastify: "5.x", name: "@hims/record-foundation" },
  );
}
