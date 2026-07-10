import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import type { EventBus } from "@hims/ts-sdk-events";
import type {
  ModuleCapabilityResolverPort,
  InfrastructureModuleCatalogPort,
  RunConfiguratorTransaction,
  TenantAdminProvisioningPort,
} from "../ports.js";
import type { ProvisionTenantInput } from "../domain/onboarding.types.js";
import { getRequestActorId } from "../http/request-actor.js";
import { provisionTenant } from "../use-cases/provision-tenant.js";
import { tenantOnboardingBodySchema } from "./tenant-onboarding.schemas.js";

export interface TenantOnboardingHandlerDeps {
  runConfiguratorTransaction: RunConfiguratorTransaction;
  createInfrastructureCatalog: (
    authorization?: string,
  ) => InfrastructureModuleCatalogPort;
  createModuleCapabilityResolver: (
    authorization?: string,
  ) => ModuleCapabilityResolverPort;
  createAdminProvisioner: (
    authorization?: string,
  ) => TenantAdminProvisioningPort;
  eventBus: EventBus;
}

export function registerTenantOnboardingHandler(
  app: FastifyInstance,
  deps: TenantOnboardingHandlerDeps,
): void {
  app.post<{ Body: ProvisionTenantInput }>(
    "/tenant-onboarding",
    {
      schema: {
        body: tenantOnboardingBodySchema,
      },
      config: { authMode: "protected" },
    },
    async (request, reply) => {
      const correlationId = randomUUID();
      const actorId = getRequestActorId(request) ?? correlationId;
      const authorization =
        typeof request.headers.authorization === "string"
          ? request.headers.authorization
          : undefined;

      const result = await provisionTenant(
        {
          runConfiguratorTransaction: deps.runConfiguratorTransaction,
          infrastructureCatalog:
            deps.createInfrastructureCatalog(authorization),
          moduleCapabilityResolver:
            deps.createModuleCapabilityResolver(authorization),
          adminProvisioner: deps.createAdminProvisioner(authorization),
          eventBus: deps.eventBus,
        },
        { actorId, correlationId },
        request.body,
      );

      return reply.code(201).send(result);
    },
  );
}
