import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { IntegrationHubControlPlaneError } from "../domain/integration-errors.js";
import { INTEGRATION_TYPE_CATALOG } from "../domain/integration-type-catalog.js";
import { replyWithControlPlaneError } from "../http/map-control-plane-error.js";
import { activateIntegration } from "../use-cases/activate-integration.js";
import type { ActivateIntegrationDeps } from "../use-cases/activate-integration.js";
import { createIntegration } from "../use-cases/create-integration.js";
import type { CreateIntegrationDeps } from "../use-cases/create-integration.js";
import { deleteIntegration } from "../use-cases/delete-integration.js";
import type { DeleteIntegrationDeps } from "../use-cases/delete-integration.js";
import { disableIntegration } from "../use-cases/disable-integration.js";
import type { DisableIntegrationDeps } from "../use-cases/disable-integration.js";
import { reactivateIntegration } from "../use-cases/reactivate-integration.js";
import type { ReactivateIntegrationDeps } from "../use-cases/reactivate-integration.js";
import type { IntegrationsRepository } from "../ports.js";

const protectedRoute = { config: { authMode: "protected" as const } };

export type IntegrationsHandlerDeps = {
  getTenantId: (request: FastifyRequest) => string;
  getActorId: (request: FastifyRequest) => string;
  getAuthorizationHeader: (request: FastifyRequest) => string;
  createIntegrationDeps: CreateIntegrationDeps;
  activateIntegrationDeps: ActivateIntegrationDeps;
  disableIntegrationDeps: DisableIntegrationDeps;
  reactivateIntegrationDeps: ReactivateIntegrationDeps;
  deleteIntegrationDeps: DeleteIntegrationDeps;
  integrationsRepository: IntegrationsRepository;
};

function handleError(reply: FastifyReply, request: FastifyRequest, err: unknown): void {
  if (err instanceof IntegrationHubControlPlaneError) {
    replyWithControlPlaneError(reply, err, request.correlationId ?? request.id);
    return;
  }
  throw err;
}

export function registerIntegrationsHandler(app: FastifyInstance, deps: IntegrationsHandlerDeps): void {
  app.get("/integration-types", protectedRoute, async (_request, reply) => {
    return reply.send({ data: Object.values(INTEGRATION_TYPE_CATALOG) });
  });

  app.get("/integrations", protectedRoute, async (request, reply) => {
    const tenantId = deps.getTenantId(request);
    const data = await deps.integrationsRepository.list(tenantId);
    return reply.send({ data });
  });

  app.post<{ Body: { name: string; integration_type: string; direction?: string } }>(
    "/integrations",
    protectedRoute,
    async (request, reply) => {
      try {
        const created = await createIntegration(
          deps.createIntegrationDeps,
          deps.getTenantId(request),
          deps.getActorId(request),
          {
            name: request.body.name,
            integration_type: request.body.integration_type,
            direction: request.body.direction as never,
          },
        );
        return reply.code(201).send(created);
      } catch (err) {
        handleError(reply, request, err);
      }
    },
  );

  app.get<{ Params: { integrationId: string } }>(
    "/integrations/:integrationId",
    protectedRoute,
    async (request, reply) => {
      const row = await deps.integrationsRepository.getById(
        deps.getTenantId(request),
        request.params.integrationId,
      );
      if (!row) {
        return reply.code(404).send({ code: "INTEGRATION_NOT_FOUND", message: "Not found" });
      }
      return reply.send(row);
    },
  );

  app.patch<{
    Params: { integrationId: string };
    Body: { name?: string; config?: { allowedOperations?: string[]; capabilityKeys?: string[] } };
  }>(
    "/integrations/:integrationId",
    protectedRoute,
    async (request, reply) => {
      try {
        const updated = await deps.integrationsRepository.update(
          deps.getTenantId(request),
          request.params.integrationId,
          {
            name: request.body.name,
            config: request.body.config,
            updatedBy: deps.getActorId(request),
          },
        );
        return reply.send(updated);
      } catch (err) {
        handleError(reply, request, err);
      }
    },
  );

  app.delete<{ Params: { integrationId: string } }>(
    "/integrations/:integrationId",
    protectedRoute,
    async (request, reply) => {
      try {
        await deleteIntegration(
          deps.deleteIntegrationDeps,
          deps.getTenantId(request),
          request.params.integrationId,
        );
        return reply.code(204).send();
      } catch (err) {
        handleError(reply, request, err);
      }
    },
  );

  app.post<{ Params: { integrationId: string } }>(
    "/integrations/:integrationId/activate",
    protectedRoute,
    async (request, reply) => {
      try {
        const activated = await activateIntegration(deps.activateIntegrationDeps, {
          tenantId: deps.getTenantId(request),
          integrationId: request.params.integrationId,
          actorId: deps.getActorId(request),
          authorizationHeader: deps.getAuthorizationHeader(request),
        });
        return reply.send(activated);
      } catch (err) {
        handleError(reply, request, err);
      }
    },
  );

  app.post<{ Params: { integrationId: string } }>(
    "/integrations/:integrationId/disable",
    protectedRoute,
    async (request, reply) => {
      try {
        const disabled = await disableIntegration(deps.disableIntegrationDeps, {
          tenantId: deps.getTenantId(request),
          integrationId: request.params.integrationId,
          actorId: deps.getActorId(request),
          authorizationHeader: deps.getAuthorizationHeader(request),
        });
        return reply.send(disabled);
      } catch (err) {
        handleError(reply, request, err);
      }
    },
  );

  app.post<{ Params: { integrationId: string } }>(
    "/integrations/:integrationId/reactivate",
    protectedRoute,
    async (request, reply) => {
      try {
        const reactivated = await reactivateIntegration(deps.reactivateIntegrationDeps, {
          tenantId: deps.getTenantId(request),
          integrationId: request.params.integrationId,
          actorId: deps.getActorId(request),
          authorizationHeader: deps.getAuthorizationHeader(request),
        });
        return reply.send(reactivated);
      } catch (err) {
        handleError(reply, request, err);
      }
    },
  );
}
