import type { FastifyInstance, FastifyRequest } from "fastify";
import { PartnerPrincipalNotFoundError } from "../domain/errors.js";
import type { ProvisionPartnerPrincipalInput } from "../domain/types.js";
import { replyWithUserManagementError } from "../http/map-user-management-error.js";
import { deactivatePartnerPrincipal } from "../use-cases/deactivate-partner-principal.js";
import type { DeactivatePartnerPrincipalDeps } from "../use-cases/deactivate-partner-principal.js";
import { provisionPartnerPrincipal } from "../use-cases/provision-partner-principal.js";
import type { ProvisionPartnerPrincipalDeps } from "../use-cases/provision-partner-principal.js";
import { reactivatePartnerPrincipal } from "../use-cases/reactivate-partner-principal.js";
import type { ReactivatePartnerPrincipalDeps } from "../use-cases/reactivate-partner-principal.js";

const protectedRoute = { config: { authMode: "protected" as const } };

export type PartnerPrincipalHandlersDeps = {
  getTenantId: (request: FastifyRequest) => string;
  getActorId: (request: FastifyRequest) => string;
  provisionPartnerPrincipalDeps: ProvisionPartnerPrincipalDeps;
  deactivatePartnerPrincipalDeps: DeactivatePartnerPrincipalDeps;
  reactivatePartnerPrincipalDeps: ReactivatePartnerPrincipalDeps;
};

function normalizeProvisionBody(body: Record<string, unknown>): ProvisionPartnerPrincipalInput {
  const suggested =
    body.suggested_capability_keys ??
    body.capability_keys ??
    body.suggestedCapabilityKeys ??
    body.capabilityKeys;

  return {
    integration_id: typeof body.integration_id === "string" ? body.integration_id : "",
    integration_display_name:
      typeof body.integration_display_name === "string" ? body.integration_display_name : "",
    suggested_capability_keys: Array.isArray(suggested)
      ? suggested.filter((key): key is string => typeof key === "string")
      : [],
  };
}

export function registerPartnerPrincipalHandlers(
  fastify: FastifyInstance,
  deps: PartnerPrincipalHandlersDeps,
): void {
  fastify.post<{ Body: Record<string, unknown> }>(
    "/partner-principals",
    protectedRoute,
    async (request, reply) => {
      try {
        const created = await provisionPartnerPrincipal(
          deps.provisionPartnerPrincipalDeps,
          {
            tenantId: deps.getTenantId(request),
            actorId: deps.getActorId(request),
          },
          normalizeProvisionBody(request.body ?? {}),
        );
        return reply.code(201).send(created);
      } catch (err) {
        return replyWithUserManagementError(reply, err, request.correlationId ?? request.id);
      }
    },
  );

  fastify.post<{ Params: { integrationId: string } }>(
    "/partner-principals/:integrationId/deactivate",
    protectedRoute,
    async (request, reply) => {
      try {
        const updated = await deactivatePartnerPrincipal(
          deps.deactivatePartnerPrincipalDeps,
          deps.getTenantId(request),
          request.params.integrationId,
          deps.getActorId(request),
        );
        if (updated === null) {
          throw new PartnerPrincipalNotFoundError(request.params.integrationId);
        }
        return reply.send(updated);
      } catch (err) {
        return replyWithUserManagementError(reply, err, request.correlationId ?? request.id);
      }
    },
  );

  fastify.post<{ Params: { integrationId: string } }>(
    "/partner-principals/:integrationId/reactivate",
    protectedRoute,
    async (request, reply) => {
      try {
        const updated = await reactivatePartnerPrincipal(
          deps.reactivatePartnerPrincipalDeps,
          deps.getTenantId(request),
          request.params.integrationId,
          deps.getActorId(request),
        );
        if (updated === null) {
          throw new PartnerPrincipalNotFoundError(request.params.integrationId);
        }
        return reply.send(updated);
      } catch (err) {
        return replyWithUserManagementError(reply, err, request.correlationId ?? request.id);
      }
    },
  );
}
