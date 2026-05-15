import type { FastifyReply } from "fastify";

export type AuthErrorBody = {
  code: string;
  message?: string;
  correlation_id?: string;
};

/** Minimal request surface for auth error formatting (no Fastify / identity coupling). */
export type AuthErrorRequestContext = {
  correlationId?: string;
};

function buildAuthErrorBody(
  code: string,
  message: string | undefined,
  request: AuthErrorRequestContext,
): AuthErrorBody {
  const body: AuthErrorBody = { code };
  if (message !== undefined) {
    body.message = message;
  }
  const cid = request.correlationId;
  if (typeof cid === "string" && cid.length > 0) {
    body.correlation_id = cid;
  }
  return body;
}

export function unauthorized(
  reply: FastifyReply,
  request: AuthErrorRequestContext,
  code: string,
  message?: string,
): never {
  return reply.code(401).send(buildAuthErrorBody(code, message, request)) as never;
}

export function forbidden(
  reply: FastifyReply,
  request: AuthErrorRequestContext,
  code: string,
  message?: string,
): never {
  return reply.code(403).send(buildAuthErrorBody(code, message, request)) as never;
}
