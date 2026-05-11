import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import type { OrganizationRepo, TenantRepo } from "./ports.js";
import { registerOrganizationsHandler } from "./rest-handlers/organizations.handler.js";
import { registerTenantsHandler } from "./rest-handlers/tenants.handler.js";

export interface ConfiguratorRouterOptions {
  organizationRepo: OrganizationRepo;
  tenantRepo: TenantRepo;
}

async function configuratorRouter(
  app: FastifyInstance,
  options: ConfiguratorRouterOptions,
): Promise<void> {
  registerOrganizationsHandler(app, options.organizationRepo);
  registerTenantsHandler(app, options.tenantRepo);
}

export function createRouter(options: ConfiguratorRouterOptions) {
  return fp(
    async (app: FastifyInstance) => configuratorRouter(app, options),
    { fastify: "5.x", name: "@hims/configurator" },
  );
}
