import type { DbInstance } from "@hims/ts-sdk-db";
import type { FastifyInstance } from "fastify";
import type { EventBus } from "@hims/ts-sdk-events";
import fp from "fastify-plugin";
import type {
  OrganizationRepo,
  TenantRepo,
  TenantModuleRepo,
  TenantIntegrationProfilesRepo,
  SequenceConfigurationRepo,
  RunConfiguratorTransaction,
  InfrastructureModuleCatalogPort,
  ModuleCapabilityResolverPort,
  TenantAdminProvisioningPort,
} from "./ports.js";
import { ConfiguratorError } from "./errors.js";
import { registerOrganizationsHandler } from "./rest-handlers/organizations.handler.js";
import { registerTenantsHandler } from "./rest-handlers/tenants.handler.js";
import { registerInternalTenantEntitlementHandler } from "./rest-handlers/internal-tenant-entitlement.handler.js";
import { registerTenantModulesHandler } from "./rest-handlers/tenant-modules.handler.js";
import { registerTenantIntegrationProfilesHandler } from "./rest-handlers/tenant-integration-profiles.handler.js";
import { registerTenantOnboardingHandler } from "./rest-handlers/tenant-onboarding.handler.js";
import { registerSequenceConfigurationHandler } from "./rest-handlers/sequence-configuration.handler.js";
import { registerBrandingLogosHandler } from "./rest-handlers/branding-logos.handler.js";

export interface ConfiguratorRouterOptions {
  db: DbInstance;
  organizationRepo: OrganizationRepo;
  tenantRepo: TenantRepo;
  tenantModuleRepo: TenantModuleRepo;
  tenantIntegrationProfilesRepo: TenantIntegrationProfilesRepo;
  sequenceConfigurationRepo: SequenceConfigurationRepo;
  runConfiguratorTransaction: RunConfiguratorTransaction;
  createInfrastructureCatalog?: (
    authorization?: string,
  ) => InfrastructureModuleCatalogPort;
  createModuleCapabilityResolver?: (
    authorization?: string,
  ) => ModuleCapabilityResolverPort;
  createAdminProvisioner?: (
    authorization?: string,
  ) => TenantAdminProvisioningPort;
  eventBus?: EventBus;
  entitlementCacheInvalidator?: import("./rest-handlers/tenant-modules.handler.js").TenantModuleEntitlementCacheInvalidator;
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
    const pgCode =
      error &&
      typeof error === "object" &&
      "code" in error &&
      typeof (error as { code: unknown }).code === "string"
        ? (error as { code: string }).code
        : undefined;
    if (pgCode === "23505") {
      return reply.status(409).send({
        error: "A record with the same unique key already exists",
        code: "CONFLICT",
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
    eventBus: options.eventBus,
    entitlementCacheInvalidator: options.entitlementCacheInvalidator,
  });
  registerInternalTenantEntitlementHandler(app, {
    db: options.db,
  });
  registerTenantIntegrationProfilesHandler(app, {
    tenantIntegrationProfilesRepo: options.tenantIntegrationProfilesRepo,
    tenantRepo: options.tenantRepo,
  });
  registerSequenceConfigurationHandler(app, {
    tenantRepo: options.tenantRepo,
    sequenceConfigurationRepo: options.sequenceConfigurationRepo,
  });
  registerBrandingLogosHandler(app);

  if (
    options.createInfrastructureCatalog &&
    options.createModuleCapabilityResolver &&
    options.createAdminProvisioner &&
    options.eventBus
  ) {
    registerTenantOnboardingHandler(app, {
      runConfiguratorTransaction: options.runConfiguratorTransaction,
      createInfrastructureCatalog: options.createInfrastructureCatalog,
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
