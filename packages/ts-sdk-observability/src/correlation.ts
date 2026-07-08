import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import { randomUUID } from "node:crypto";

/** Canonical correlation header, both inbound (accepted) and outbound (emitted). */
export const CORRELATION_HEADER = "x-correlation-id";
/** Also accepted inbound, as many gateways/proxies emit this instead. */
export const REQUEST_ID_HEADER = "x-request-id";

declare module "fastify" {
  interface FastifyRequest {
    /** Canonical request correlation id, propagated across services, events and logs. */
    correlationId: string;
  }
}

export interface CorrelationPluginOptions {
  /** Response header to echo the id on. Defaults to `x-correlation-id`. */
  responseHeader?: string;
  /** Child-logger field name. Defaults to `correlationId`. */
  logLabel?: string;
}

/**
 * Accept an inbound correlation id if it is a plausible token: a trimmed string
 * of 1..128 chars containing only letters, digits and common id punctuation.
 * We deliberately preserve upstream ids (they may not be UUIDs) so a trace spans
 * services; missing/garbage values are replaced with a fresh uuid. The token
 * restriction rejects whitespace/control chars that could smuggle into a log
 * line or HTTP response header.
 */
function normalizeInbound(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const candidate = value.trim();
  if (candidate.length === 0 || candidate.length > 128) return undefined;
  if (!/^[A-Za-z0-9._:+/=-]+$/.test(candidate)) return undefined;
  return candidate;
}

function resolveInbound(headers: Record<string, unknown>): string | undefined {
  return normalizeInbound(headers[CORRELATION_HEADER]) ?? normalizeInbound(headers[REQUEST_ID_HEADER]);
}

/**
 * App-level plugin that gives every request a correlation id:
 *  - reads `x-correlation-id` / `x-request-id`, else generates a uuid,
 *  - stores it on `request.correlationId`,
 *  - binds it to `request.log` (child logger) so every log line carries it,
 *  - echoes it on the response header.
 *
 * Register this FIRST (app root), before auth/tenant plugins, so all routes
 * — healthz, docs, internal — are covered. It is idempotent: if something
 * upstream already decorated/set `correlationId`, it is preserved.
 */
export const correlationIdPlugin = fp(
  async (app: FastifyInstance, options: CorrelationPluginOptions) => {
    const responseHeader = options.responseHeader ?? CORRELATION_HEADER;
    const logLabel = options.logLabel ?? "correlationId";

    if (!app.hasRequestDecorator("correlationId")) {
      app.decorateRequest("correlationId", "");
    }

    app.addHook("onRequest", async (request, reply) => {
      if (!request.correlationId) {
        request.correlationId = resolveInbound(request.headers) ?? randomUUID();
      }
      reply.header(responseHeader, request.correlationId);
      request.log = request.log.child({ [logLabel]: request.correlationId });
    });
  },
  { fastify: "5.x", name: "@hims/ts-sdk-observability/correlation" },
);
