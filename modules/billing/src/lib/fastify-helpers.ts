import type { FastifyRequest } from "fastify";

export function parseIdempotencyKey(
  headers: FastifyRequest["headers"],
): string | undefined {
  const raw = headers["idempotency-key"];
  if (typeof raw === "string") return raw;
  if (Array.isArray(raw)) return raw[0];
  return undefined;
}

export const protectedRoute = { config: { authMode: "protected" as const } };
