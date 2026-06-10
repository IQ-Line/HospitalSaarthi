import type { FastifyInstance, FastifyRequest, RouteHandlerMethod } from "fastify";
import { CerbosPrincipalUnavailableError, UserNotFoundError } from "../domain/errors.js";
import { registerEmptyJsonBodyParser } from "../http/register-empty-json-body-parser.js";
import { replyWithUserManagementError } from "../http/map-user-management-error.js";
import { getUserById } from "../use-cases/get-user.js";
import type { GetUserDeps } from "../use-cases/get-user.js";
import {
  validateUserApiKey,
  type ValidateUserApiKeyDeps,
} from "../use-cases/validate-user-api-key.js";

function readApiKeyHeader(
  value: string | string[] | undefined,
): string | undefined {
  if (Array.isArray(value)) return value[0]?.trim();
  return typeof value === "string" ? value.trim() : undefined;
}

function resolveApiKeyFromRequest(request: FastifyRequest): string | undefined {
  return (
    readApiKeyHeader(request.headers["x-api-key"]) ??
    (typeof request.body === "object" &&
    request.body !== null &&
    "api_key" in request.body &&
    typeof (request.body as { api_key?: unknown }).api_key === "string"
      ? (request.body as { api_key: string }).api_key.trim()
      : undefined)
  );
}

function createValidateApiKeyHandler(
  deps: AuthHandlersDeps,
): RouteHandlerMethod {
  return async (request, reply) => {
    const cid = request.correlationId ?? request.id;
    const apiKey = resolveApiKeyFromRequest(request);
    if (!apiKey) {
      return reply.status(400).send({
        code: "API_KEY_REQUIRED",
        message: "X-API-Key header or api_key body field is required",
        correlation_id: cid,
      });
    }
    try {
      return reply.send(await validateUserApiKey(deps.validateUserApiKeyDeps, apiKey));
    } catch (err) {
      return replyWithUserManagementError(reply, err, cid);
    }
  };
}

export type AuthHandlersDeps = {
  /** Tenant from verified JWT (`iq_tenant_id` / `tenantId` on `request.user`). */
  getTenantId: (request: FastifyRequest) => string;
  /** Platform user id from verified JWT (`sub` / `userId` on `request.user`). */
  getUserId: (request: FastifyRequest) => string;
  getUserDeps: GetUserDeps;
  validateUserApiKeyDeps: ValidateUserApiKeyDeps;
};

export function registerAuthHandlers(fastify: FastifyInstance, deps: AuthHandlersDeps): void {
  fastify.get(
    "/auth/me",
    { config: { authMode: "protected" } },
    async (request, reply) => {
      const tenantId = deps.getTenantId(request);
      const userId = deps.getUserId(request);
      const cid = request.correlationId ?? request.id;
      const user = await getUserById(deps.getUserDeps, tenantId, userId);
      if (user === null) {
        return replyWithUserManagementError(reply, new UserNotFoundError(userId), cid);
      }
      return reply.send(user);
    },
  );

  fastify.get(
    "/auth/principal",
    { config: { authMode: "protected" } },
    async (request, reply) => {
      const cid = request.correlationId ?? request.id;
      const snapshot = request.cerbosPrincipal;
      if (snapshot === undefined) {
        return replyWithUserManagementError(reply, new CerbosPrincipalUnavailableError(), cid);
      }
      return reply.send(snapshot);
    },
  );

  void fastify.register(async (scope) => {
    registerEmptyJsonBodyParser(scope);
    const validateApiKey = createValidateApiKeyHandler(deps);
    const routeConfig = { config: { authMode: "public" as const } };
    scope.post("/auth/api-key/validate", routeConfig, validateApiKey);
    scope.get("/auth/api-key/validate", routeConfig, validateApiKey);
    // Deprecated aliases — use `/auth/api-key/validate`
    scope.post("/auth/api-key", routeConfig, validateApiKey);
    scope.get("/auth/api-key", routeConfig, validateApiKey);
  });
}
