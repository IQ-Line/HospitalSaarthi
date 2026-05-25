import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import type { EventBus } from "@hims/ts-sdk-events";
import type {
  ModuleCapabilityResolverPort,
  RunConfiguratorTransaction,
  TenantAdminProvisioningPort,
} from "../ports.js";
import type { ProvisionTenantInput } from "../domain/onboarding.types.js";
import { provisionTenant } from "../use-cases/provision-tenant.js";
import { tenantOnboardingBodySchema } from "./tenant-onboarding.schemas.js";

export interface TenantOnboardingHandlerDeps {
  runConfiguratorTransaction: RunConfiguratorTransaction;
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
    },
    async (request, reply) => {
      const correlationId = randomUUID();
      const actorId = resolveActorId(request) ?? correlationId;
      const authorization =
        typeof request.headers.authorization === "string"
          ? request.headers.authorization
          : undefined;

      const result = await provisionTenant(
        {
          runConfiguratorTransaction: deps.runConfiguratorTransaction,
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

/**
 * Best-effort actor ID extraction from the request.
 * In production this comes from the JWT `sub` claim after auth middleware runs.
 * Falls back to null if no authenticated user context is present.
 */
function resolveActorId(request: { user?: unknown }): string | null {
  const user = request.user as Record<string, unknown> | undefined;
  if (!user) return null;
  const sub = user["sub"] ?? user["id"] ?? user["userId"];
  return typeof sub === "string" && sub.length > 0 ? sub : null;
}
