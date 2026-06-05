import type { FastifyInstance, FastifyRequest } from "fastify";
import { replyWithUserManagementError } from "../http/map-user-management-error.js";
import { UserManagementError } from "../domain/errors.js";
import { deactivatePartnerPrincipal } from "../use-cases/deactivate-partner-principal.js";
import type { DeactivatePartnerPrincipalDeps } from "../use-cases/deactivate-partner-principal.js";
import { reactivatePartnerPrincipal } from "../use-cases/reactivate-partner-principal.js";
import type { ReactivatePartnerPrincipalDeps } from "../use-cases/reactivate-partner-principal.js";
import { provisionPartnerPrincipal } from "../use-cases/provision-partner-principal.js";
import type { ProvisionPartnerPrincipalDeps } from "../use-cases/provision-partner-principal.js";

export type PartnerPrincipalHandlersDeps = {
  getTenantId: (request: FastifyRequest) => string;
  getActorId: (request: FastifyRequest) => string;
  provisionPartnerPrincipalDeps: ProvisionPartnerPrincipalDeps;
  deactivatePartnerPrincipalDeps: DeactivatePartnerPrincipalDeps;
  reactivatePartnerPrincipalDeps: ReactivatePartnerPrincipalDeps;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function registerPartnerPrincipalHandlers(
  app: FastifyInstance,
  deps: PartnerPrincipalHandlersDeps,
): void {
  app.post<{
    Body: {
      integration_id: string;
      integration_display_name: string;
      capability_keys: string[];
    };
  }>(
    "/partner-principals",
    { config: { authMode: "protected" } },
    async (request, reply) => {
      const body = request.body;
      if (!UUID_RE.test(body.integration_id)) {
        return reply.code(400).send({
          code: "INVALID_INPUT",
          message: "integration_id must be a UUID.",
        });
      }
      if (
        typeof body.integration_display_name !== "string" ||
        body.integration_display_name.trim().length === 0
      ) {
        return reply.code(400).send({
          code: "INVALID_INPUT",
          message: "integration_display_name is required.",
        });
      }
      if (!Array.isArray(body.capability_keys)) {
        return reply.code(400).send({
          code: "INVALID_INPUT",
          message: "capability_keys must be an array of strings.",
        });
      }

      try {
        const user = await provisionPartnerPrincipal(
          deps.provisionPartnerPrincipalDeps,
          {
            tenantId: deps.getTenantId(request),
            actorId: deps.getActorId(request),
          },
          {
            integrationId: body.integration_id,
            integrationDisplayName: body.integration_display_name,
            capabilityKeys: body.capability_keys,
          },
        );
        return reply.code(201).send(user);
      } catch (err) {
        if (err instanceof UserManagementError) {
          return replyWithUserManagementError(
            reply,
            err,
            request.correlationId ?? request.id,
          );
        }
        throw err;
      }
    },
  );

  app.post<{ Params: { integrationId: string } }>(
    "/partner-principals/:integrationId/deactivate",
    { config: { authMode: "protected" } },
    async (request, reply) => {
      const { integrationId } = request.params;
      if (!UUID_RE.test(integrationId)) {
        return reply.code(400).send({
          code: "INVALID_INPUT",
          message: "integrationId must be a UUID.",
        });
      }

      try {
        const user = await deactivatePartnerPrincipal(
          deps.deactivatePartnerPrincipalDeps,
          {
            tenantId: deps.getTenantId(request),
            actorId: deps.getActorId(request),
          },
          integrationId,
        );
        if (user === null) {
          return reply.code(404).send({
            code: "PARTNER_PRINCIPAL_NOT_FOUND",
            message: "No partner principal exists for this integration.",
          });
        }
        return reply.send(user);
      } catch (err) {
        if (err instanceof UserManagementError) {
          return replyWithUserManagementError(
            reply,
            err,
            request.correlationId ?? request.id,
          );
        }
        throw err;
      }
    },
  );

  app.post<{ Params: { integrationId: string } }>(
    "/partner-principals/:integrationId/reactivate",
    { config: { authMode: "protected" } },
    async (request, reply) => {
      const { integrationId } = request.params;
      if (!UUID_RE.test(integrationId)) {
        return reply.code(400).send({
          code: "INVALID_INPUT",
          message: "integrationId must be a UUID.",
        });
      }

      try {
        const user = await reactivatePartnerPrincipal(
          deps.reactivatePartnerPrincipalDeps,
          { tenantId: deps.getTenantId(request) },
          integrationId,
        );
        if (user === null) {
          return reply.code(404).send({
            code: "PARTNER_PRINCIPAL_NOT_FOUND",
            message: "No partner principal exists for this integration.",
          });
        }
        return reply.send(user);
      } catch (err) {
        if (err instanceof UserManagementError) {
          return replyWithUserManagementError(
            reply,
            err,
            request.correlationId ?? request.id,
          );
        }
        throw err;
      }
    },
  );
}
