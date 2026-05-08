import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import { randomUUID } from "node:crypto";
import type { IdentityPluginOptions, Principal } from "./types.js";
import { verifyToken } from "./verify.js";

const SKIP_PATHS = new Set(["/healthz", "/readyz", "/livez"]);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function resolveCorrelationId(headerValue: unknown): string {
  if (typeof headerValue !== "string") {
    return randomUUID();
  }
  const candidate = headerValue.trim();
  if (candidate.length === 0 || candidate.length > 64) {
    return randomUUID();
  }
  if (!UUID_RE.test(candidate)) {
    return randomUUID();
  }
  return candidate;
}

async function identityPluginFn(
  fastify: FastifyInstance,
  options: IdentityPluginOptions,
): Promise<void> {
  fastify.decorateRequest("user", undefined as unknown as Principal);
  fastify.decorateRequest("correlationId", "");

  fastify.addHook(
    "onRequest",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const correlationId = resolveCorrelationId(request.headers["x-correlation-id"]);
      request.correlationId = correlationId;
      reply.header("x-correlation-id", correlationId);

      if (SKIP_PATHS.has(request.url)) return;

      const header = request.headers.authorization;
      if (!header?.startsWith("Bearer ")) {
        reply.code(401).send({
          code: "AUTH_MISSING_BEARER",
          message: "Missing or malformed Authorization header",
          correlation_id: request.correlationId,
        });
        return;
      }

      const token = header.slice(7);
      try {
        request.user = await verifyToken(token, options);
      } catch {
        fastify.log.warn(
          { path: request.url, correlation_id: request.correlationId },
          "JWT verification failed",
        );
        reply.code(401).send({
          code: "AUTH_INVALID_TOKEN",
          message: "Invalid or expired token",
          correlation_id: request.correlationId,
        });
      }
    },
  );
}

export const identityPlugin = fp(identityPluginFn, {
  fastify: "5.x",
  name: "@hims/ts-sdk-identity",
});
