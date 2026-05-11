import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import type {
  OrganizationRepo,
  TenantRepo,
  RunConfiguratorTransaction,
} from "./ports.js";
import { ConfiguratorError } from "./errors.js";
import { registerOrganizationsHandler } from "./rest-handlers/organizations.handler.js";
import { registerTenantsHandler } from "./rest-handlers/tenants.handler.js";

export interface ConfiguratorRouterOptions {
  organizationRepo: OrganizationRepo;
  tenantRepo: TenantRepo;
  runConfiguratorTransaction: RunConfiguratorTransaction;
}

async function configuratorRouter(
  app: FastifyInstance,
  options: ConfiguratorRouterOptions,
): Promise<void> {
  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ConfiguratorError) {
      return reply.status(error.statusCode).send({
        error: error.message,
        ...(error.code ? { code: error.code } : {}),
      });
    }
    throw error;
  });

  registerOrganizationsHandler(app, {
    organizationRepo: options.organizationRepo,
    runConfiguratorTransaction: options.runConfiguratorTransaction,
  });
  registerTenantsHandler(app, {
    tenantRepo: options.tenantRepo,
    organizationRepo: options.organizationRepo,
  });
}

export function createRouter(options: ConfiguratorRouterOptions) {
  return fp(
    async (app: FastifyInstance) => configuratorRouter(app, options),
    { fastify: "5.x", name: "@hims/configurator", encapsulate: true },
  );
}
