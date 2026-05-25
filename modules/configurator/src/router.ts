import type { FastifyInstance } from "fastify";
import type { EventBus } from "@hims/ts-sdk-events";
import fp from "fastify-plugin";
import type {
  OrganizationRepo,
  TenantRepo,
  TenantModuleRepo,
  RunConfiguratorTransaction,
  ModuleCapabilityResolverPort,
  TenantAdminProvisioningPort,
} from "./ports.js";
import { ConfiguratorError } from "./errors.js";
import { registerOrganizationsHandler } from "./rest-handlers/organizations.handler.js";
import { registerTenantsHandler } from "./rest-handlers/tenants.handler.js";
import { registerTenantModulesHandler } from "./rest-handlers/tenant-modules.handler.js";
import { registerTenantOnboardingHandler } from "./rest-handlers/tenant-onboarding.handler.js";

export interface ConfiguratorRouterOptions {
  organizationRepo: OrganizationRepo;
  tenantRepo: TenantRepo;
  tenantModuleRepo: TenantModuleRepo;
  runConfiguratorTransaction: RunConfiguratorTransaction;
  createModuleCapabilityResolver?: (
    authorization?: string,
  ) => ModuleCapabilityResolverPort;
  createAdminProvisioner?: (
    authorization?: string,
  ) => TenantAdminProvisioningPort;
  eventBus?: EventBus;
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
  registerTenantModulesHandler(app, {
    tenantModuleRepo: options.tenantModuleRepo,
    tenantRepo: options.tenantRepo,
  });

  if (
    options.createModuleCapabilityResolver &&
    options.createAdminProvisioner &&
    options.eventBus
  ) {
    registerTenantOnboardingHandler(app, {
      runConfiguratorTransaction: options.runConfiguratorTransaction,
      createModuleCapabilityResolver: options.createModuleCapabilityResolver,
      createAdminProvisioner: options.createAdminProvisioner,
      eventBus: options.eventBus,
    });
  }
}

export function createRouter(options: ConfiguratorRouterOptions) {
  return fp(
    async (app: FastifyInstance) => configuratorRouter(app, options),
    { fastify: "5.x", name: "@hims/configurator", encapsulate: true },
  );
}
