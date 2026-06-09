import type { FastifyInstance, FastifyRequest } from "fastify";
import { listIntegrationTypeCatalog } from "../domain/integration-type-catalog.js";
import { listPartnerOperationCatalog } from "../domain/partner-exposed-operations.js";
import type { CreateIntegrationInput, UpdateIntegrationInput } from "../domain/integration.types.js";
import { activateIntegration, type ActivateIntegrationDeps } from "../use-cases/activate-integration.js";
import { createIntegration, type CreateIntegrationDeps } from "../use-cases/create-integration.js";
import { deleteIntegration, type DeleteIntegrationDeps } from "../use-cases/delete-integration.js";
import { disableIntegration, type DisableIntegrationDeps } from "../use-cases/disable-integration.js";
import { getIntegration, type GetIntegrationDeps } from "../use-cases/get-integration.js";
import { issueApiKey, type IssueApiKeyDeps } from "../use-cases/issue-api-key.js";
import { listApiKeys, type ListApiKeysDeps } from "../use-cases/list-api-keys.js";
import { listIntegrations, type ListIntegrationsDeps } from "../use-cases/list-integrations.js";
import { reactivateIntegration, type ReactivateIntegrationDeps } from "../use-cases/reactivate-integration.js";
import { revokeApiKey, type RevokeApiKeyDeps } from "../use-cases/revoke-api-key.js";
import { updateIntegration, type UpdateIntegrationDeps } from "../use-cases/update-integration.js";
import { replyWithControlPlaneError } from "./map-control-plane-error.js";

const protectedRoute = { config: { authMode: "protected" as const } };

export type IntegrationHandlersDeps = {
  getTenantId: (request: FastifyRequest) => string;
  getActorId: (request: FastifyRequest) => string;
  getAuthorization: (request: FastifyRequest) => string;
  createIntegrationDeps: CreateIntegrationDeps;
  updateIntegrationDeps: UpdateIntegrationDeps;
  getIntegrationDeps: GetIntegrationDeps;
  listIntegrationsDeps: ListIntegrationsDeps;
  deleteIntegrationDeps: DeleteIntegrationDeps;
  activateIntegrationDeps: ActivateIntegrationDeps;
  disableIntegrationDeps: DisableIntegrationDeps;
  reactivateIntegrationDeps: ReactivateIntegrationDeps;
  listApiKeysDeps: ListApiKeysDeps;
  issueApiKeyDeps: IssueApiKeyDeps;
  revokeApiKeyDeps: RevokeApiKeyDeps;
};

function readCreateBody(body: Record<string, unknown>): CreateIntegrationInput {
  const config =
    body.config !== null && typeof body.config === "object"
      ? (body.config as CreateIntegrationInput["config"])
      : undefined;
  return {
    integration_type:
      typeof body.integration_type === "string"
        ? body.integration_type
        : typeof body.integrationType === "string"
          ? body.integrationType
          : "",
    display_name:
      typeof body.display_name === "string"
        ? body.display_name
        : typeof body.displayName === "string"
          ? body.displayName
          : "",
    config,
  };
}

function readUpdateBody(body: Record<string, unknown>): UpdateIntegrationInput {
  const config =
    body.config !== null && typeof body.config === "object"
      ? (body.config as UpdateIntegrationInput["config"])
      : undefined;
  const patch: UpdateIntegrationInput = {};
  if (typeof body.display_name === "string") patch.display_name = body.display_name;
  if (typeof body.displayName === "string") patch.display_name = body.displayName;
  if (config !== undefined) patch.config = config;
  return patch;
}

export function registerIntegrationHandlers(
  fastify: FastifyInstance,
  deps: IntegrationHandlersDeps,
): void {
  fastify.get("/integration-types", protectedRoute, async (_request, reply) => {
    return reply.send({
      items: listIntegrationTypeCatalog(),
      partner_operations: listPartnerOperationCatalog(),
    });
  });

  fastify.get("/integrations", protectedRoute, async (request, reply) => {
    try {
      const items = await listIntegrations(deps.listIntegrationsDeps, deps.getTenantId(request));
      return reply.send({ items });
    } catch (err) {
      return replyWithControlPlaneError(reply, err, request.correlationId ?? request.id);
    }
  });

  fastify.post<{ Body: Record<string, unknown> }>(
    "/integrations",
    protectedRoute,
    async (request, reply) => {
      try {
        const created = await createIntegration(
          deps.createIntegrationDeps,
          {
            tenantId: deps.getTenantId(request),
            actorId: deps.getActorId(request),
          },
          readCreateBody(request.body ?? {}),
        );
        return reply.code(201).send(created);
      } catch (err) {
        return replyWithControlPlaneError(reply, err, request.correlationId ?? request.id);
      }
    },
  );

  fastify.get<{ Params: { integrationId: string } }>(
    "/integrations/:integrationId",
    protectedRoute,
    async (request, reply) => {
      try {
        const row = await getIntegration(
          deps.getIntegrationDeps,
          deps.getTenantId(request),
          request.params.integrationId,
        );
        return reply.send(row);
      } catch (err) {
        return replyWithControlPlaneError(reply, err, request.correlationId ?? request.id);
      }
    },
  );

  fastify.patch<{ Params: { integrationId: string }; Body: Record<string, unknown> }>(
    "/integrations/:integrationId",
    protectedRoute,
    async (request, reply) => {
      try {
        const updated = await updateIntegration(
          deps.updateIntegrationDeps,
          {
            tenantId: deps.getTenantId(request),
            actorId: deps.getActorId(request),
          },
          request.params.integrationId,
          readUpdateBody(request.body ?? {}),
        );
        return reply.send(updated);
      } catch (err) {
        return replyWithControlPlaneError(reply, err, request.correlationId ?? request.id);
      }
    },
  );

  fastify.delete<{ Params: { integrationId: string } }>(
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
        return replyWithControlPlaneError(reply, err, request.correlationId ?? request.id);
      }
    },
  );

  fastify.post<{ Params: { integrationId: string } }>(
    "/integrations/:integrationId/activate",
    protectedRoute,
    async (request, reply) => {
      try {
        const activated = await activateIntegration(
          deps.activateIntegrationDeps,
          {
            tenantId: deps.getTenantId(request),
            actorId: deps.getActorId(request),
            authorization: deps.getAuthorization(request),
          },
          request.params.integrationId,
        );
        return reply.send(activated);
      } catch (err) {
        return replyWithControlPlaneError(reply, err, request.correlationId ?? request.id);
      }
    },
  );

  fastify.post<{ Params: { integrationId: string } }>(
    "/integrations/:integrationId/disable",
    protectedRoute,
    async (request, reply) => {
      try {
        const disabled = await disableIntegration(
          deps.disableIntegrationDeps,
          {
            tenantId: deps.getTenantId(request),
            actorId: deps.getActorId(request),
            authorization: deps.getAuthorization(request),
          },
          request.params.integrationId,
        );
        return reply.send(disabled);
      } catch (err) {
        return replyWithControlPlaneError(reply, err, request.correlationId ?? request.id);
      }
    },
  );

  fastify.post<{ Params: { integrationId: string } }>(
    "/integrations/:integrationId/reactivate",
    protectedRoute,
    async (request, reply) => {
      try {
        const reactivated = await reactivateIntegration(
          deps.reactivateIntegrationDeps,
          {
            tenantId: deps.getTenantId(request),
            actorId: deps.getActorId(request),
            authorization: deps.getAuthorization(request),
          },
          request.params.integrationId,
        );
        return reply.send(reactivated);
      } catch (err) {
        return replyWithControlPlaneError(reply, err, request.correlationId ?? request.id);
      }
    },
  );

  fastify.get<{ Params: { integrationId: string } }>(
    "/integrations/:integrationId/api-keys",
    protectedRoute,
    async (request, reply) => {
      try {
        const items = await listApiKeys(
          deps.listApiKeysDeps,
          deps.getTenantId(request),
          request.params.integrationId,
        );
        return reply.send({ items });
      } catch (err) {
        return replyWithControlPlaneError(reply, err, request.correlationId ?? request.id);
      }
    },
  );

  fastify.post<{
    Params: { integrationId: string };
    Body: { expires_at?: string | null };
  }>(
    "/integrations/:integrationId/api-keys",
    protectedRoute,
    async (request, reply) => {
      try {
        const issued = await issueApiKey(
          deps.issueApiKeyDeps,
          {
            tenantId: deps.getTenantId(request),
            actorId: deps.getActorId(request),
          },
          request.params.integrationId,
          { expires_at: request.body?.expires_at ?? null },
        );
        return reply.code(201).send(issued);
      } catch (err) {
        return replyWithControlPlaneError(reply, err, request.correlationId ?? request.id);
      }
    },
  );

  fastify.post<{ Params: { integrationId: string; apiKeyId: string } }>(
    "/integrations/:integrationId/api-keys/:apiKeyId/revoke",
    protectedRoute,
    async (request, reply) => {
      try {
        const revoked = await revokeApiKey(
          deps.revokeApiKeyDeps,
          {
            tenantId: deps.getTenantId(request),
            actorId: deps.getActorId(request),
          },
          request.params.integrationId,
          request.params.apiKeyId,
        );
        return reply.send(revoked);
      } catch (err) {
        return replyWithControlPlaneError(reply, err, request.correlationId ?? request.id);
      }
    },
  );
}
