import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { IntegrationHubControlPlaneError } from "../domain/integration-errors.js";
import { replyWithControlPlaneError } from "../http/map-control-plane-error.js";
import { issueApiKey } from "../use-cases/issue-api-key.js";
import type { IssueApiKeyDeps } from "../use-cases/issue-api-key.js";
import type { IntegrationApiKeysRepository } from "../ports.js";

const protectedRoute = { config: { authMode: "protected" as const } };

export type ApiKeysHandlerDeps = {
  getTenantId: (request: FastifyRequest) => string;
  getActorId: (request: FastifyRequest) => string;
  issueApiKeyDeps: IssueApiKeyDeps;
  integrationApiKeysRepository: IntegrationApiKeysRepository;
};

function handleError(reply: FastifyReply, request: FastifyRequest, err: unknown): void {
  if (err instanceof IntegrationHubControlPlaneError) {
    replyWithControlPlaneError(reply, err, request.correlationId ?? request.id);
    return;
  }
  throw err;
}

export function registerApiKeysHandler(app: FastifyInstance, deps: ApiKeysHandlerDeps): void {
  app.get<{ Params: { integrationId: string } }>(
    "/integrations/:integrationId/api-keys",
    protectedRoute,
    async (request, reply) => {
      const data = await deps.integrationApiKeysRepository.listByIntegration(
        deps.getTenantId(request),
        request.params.integrationId,
      );
      return reply.send({ data });
    },
  );

  app.post<{
    Params: { integrationId: string };
    Body: { label: string; is_live?: boolean; rate_limit_rpm?: number };
  }>(
    "/integrations/:integrationId/api-keys",
    protectedRoute,
    async (request, reply) => {
      try {
        const issued = await issueApiKey(deps.issueApiKeyDeps, {
          tenantId: deps.getTenantId(request),
          integrationId: request.params.integrationId,
          label: request.body.label,
          actorId: deps.getActorId(request),
          isLive: request.body.is_live,
          rateLimitRpm: request.body.rate_limit_rpm,
        });
        return reply.code(201).send(issued);
      } catch (err) {
        handleError(reply, request, err);
      }
    },
  );

  app.post<{ Params: { integrationId: string; apiKeyId: string } }>(
    "/integrations/:integrationId/api-keys/:apiKeyId/revoke",
    protectedRoute,
    async (request, reply) => {
      const revoked = await deps.integrationApiKeysRepository.revoke(
        deps.getTenantId(request),
        request.params.integrationId,
        request.params.apiKeyId,
        deps.getActorId(request),
      );
      if (!revoked) {
        return reply.code(404).send({ code: "API_KEY_NOT_FOUND", message: "Not found" });
      }
      return reply.send(revoked);
    },
  );
}
