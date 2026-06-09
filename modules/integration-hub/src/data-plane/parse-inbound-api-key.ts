import type { FastifyRequest } from "fastify";

function readHeaderValue(value: string | string[] | undefined): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (Array.isArray(value) && value.length > 0) {
    const first = value[0];
    if (typeof first === "string") {
      const trimmed = first.trim();
      return trimmed.length > 0 ? trimmed : null;
    }
  }
  return null;
}

function stripBearerPrefix(value: string): string {
  return value.startsWith("Bearer ") ? value.slice("Bearer ".length).trim() : value;
}

/**
 * Resolves the integration API key secret from inbound partner requests.
 * Prefers `X-Api-Key`; falls back to `Authorization: Bearer <secret>`.
 */
export function parseInboundApiKey(request: FastifyRequest): string | null {
  const xApiKey = readHeaderValue(request.headers["x-api-key"]);
  if (xApiKey !== null) {
    const secret = stripBearerPrefix(xApiKey);
    return secret.length > 0 ? secret : null;
  }

  const authorization = readHeaderValue(request.headers.authorization);
  if (authorization !== null && authorization.startsWith("Bearer ")) {
    const token = authorization.slice("Bearer ".length).trim();
    return token.length > 0 ? token : null;
  }

  return null;
}
