import type { FastifyInstance, FastifyRequest } from "fastify";
import { CerbosPrincipalUnavailableError, UserNotFoundError } from "../domain/errors.js";
import { replyWithUserManagementError } from "../http/map-user-management-error.js";
import { getUserById } from "../use-cases/get-user.js";
import type { GetUserDeps } from "../use-cases/get-user.js";
import {
  validateUserApiKey,
  type ValidateUserApiKeyDeps,
} from "../use-cases/validate-user-api-key.js";

function readApiKeyHeader(value: string | string[] | undefined): string | undefined {
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

export type AuthHandlersDeps = {
  getTenantId: (request: FastifyRequest) => string;
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
    scope.removeContentTypeParser("application/json");
    scope.addContentTypeParser(
      "application/json",
      { parseAs: "string" },
      (_request, body, done) => {
        const text = typeof body === "string" ? body : body.toString();
        if (text.trim() === "") {
          done(null, {});
          return;
        }
        try {
          done(null, JSON.parse(text) as unknown);
        } catch (error) {
          done(error as Error, undefined);
        }
      },
    );

    const routeConfig = { config: { authMode: "public" as const } };
    const handler = async (request: FastifyRequest, reply: { status: (n: number) => { send: (b: unknown) => unknown }; send: (b: unknown) => unknown }) => {
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

    scope.post("/auth/api-key/validate", routeConfig, handler);
    scope.get("/auth/api-key/validate", routeConfig, handler);
  });
}
