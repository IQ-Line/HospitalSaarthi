import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import { randomUUID } from "node:crypto";
import { unauthorized } from "@hims/ts-sdk-http";
import type { IdentityPluginOptions, Principal } from "./types.js";
import { verifyToken } from "./verify.js";

const SKIP_PATHS = new Set(["/healthz", "/readyz", "/livez"]);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function pathForAuthSkip(url: string): string {
  let raw = url.split("?")[0] ?? "";
  if (!raw.startsWith("/")) {
    raw = `/${raw}`;
  }
  if (raw.length > 1 && raw.endsWith("/")) {
    return raw.slice(0, -1);
  }
  return raw;
}

function normalizePathPrefix(prefix: string): string {
  const raw = prefix.split("?")[0] ?? "";
  if (raw.length > 1 && raw.endsWith("/")) {
    return raw.slice(0, -1);
  }
  return raw;
}

function shouldSkipIdentityVerification(
  url: string,
  skipPathPrefixes: string[] | undefined,
): boolean {
  const path = pathForAuthSkip(url);
  if (SKIP_PATHS.has(path)) {
    return true;
  }
  if (!skipPathPrefixes || skipPathPrefixes.length === 0) {
    return false;
  }
  for (const prefix of skipPathPrefixes) {
    const p = normalizePathPrefix(prefix);
    if (p.length === 0) continue;
    if (path === p || path.startsWith(`${p}/`)) {
      return true;
    }
  }
  return false;
}

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

      if (shouldSkipIdentityVerification(request.url, options.skipPathPrefixes)) return;
      if (request.authViaApiKey === true) return;

      const header = request.headers.authorization;
      if (!header?.startsWith("Bearer ")) {
        unauthorized(reply, request, "AUTH_MISSING_BEARER", "Missing or malformed Authorization header");
      }

      const token = header.slice(7);
      try {
        request.user = await verifyToken(token, options);
      } catch {
        fastify.log.warn(
          { path: request.url, correlation_id: request.correlationId },
          "JWT verification failed",
        );
        unauthorized(reply, request, "AUTH_INVALID_TOKEN", "Invalid or expired token");
      }
    },
  );
}

export const identityPlugin = fp(identityPluginFn, {
  fastify: "5.x",
  name: "@hims/ts-sdk-identity",
});
