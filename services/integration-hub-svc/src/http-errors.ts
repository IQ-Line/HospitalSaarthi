import type { FastifyError, FastifyReply, FastifyRequest } from "fastify";
import { EnvelopeValidationError } from "@hims/ts-sdk-events";
import {
  AbdmUseCaseError,
  asAbdmGatewayError,
  formatNhaUpstreamMessage,
  IntegrationProfileNotFoundError,
  IntegrationTenantRequiredError,
} from "@hims/integration-hub";

function isFastifyValidationError(err: FastifyError): boolean {
  return (
    err.code === "FST_ERR_VALIDATION" ||
    Array.isArray((err as FastifyError & { validation?: unknown }).validation)
  );
}

function isPostgresError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const o = err as { message?: unknown; code?: unknown; cause?: unknown };
  const msg = typeof o.message === "string" ? o.message : "";
  const code = typeof o.code === "string" ? o.code : "";
  if (msg.includes("Failed query")) return true;
  if (/^[0-9A-Z]{5}$/.test(code)) return true;
  if (
    msg.includes("abdm_sessions") ||
    msg.includes("integration_hub") ||
    msg.includes("password authentication failed") ||
    msg.includes("no authentication method") ||
    msg.includes("SASL") ||
    msg.includes("ECONNREFUSED") ||
    msg.includes("Connection terminated")
  ) {
    return true;
  }
  const cause = o.cause;
  if (cause && typeof cause === "object" && "message" in cause) {
    const cm = (cause as { message?: unknown }).message;
    if (typeof cm === "string" && (cm.includes("password") || cm.includes("SASL"))) {
      return true;
    }
  }
  return false;
}

function pgMessage(err: unknown): string | null {
  if (!isPostgresError(err)) return null;
  const o = err as { message?: unknown; cause?: unknown };
  if (typeof o.message === "string" && o.message.includes("Failed query")) {
    const cause = o.cause;
    if (cause && typeof cause === "object" && "message" in cause) {
      const cm = (cause as { message?: unknown }).message;
      if (typeof cm === "string") return cm;
    }
  }
  if (typeof o.message === "string") return o.message;
  return null;
}

type ErrorResponse = {
  status: number;
  body: Record<string, unknown>;
  /** Optional logging side-effect, run before the response is sent. */
  log?: (request: FastifyRequest, err: FastifyError) => void;
};

/**
 * Maps a recognised domain/framework error to its HTTP response.
 * Each entry pairs a type/shape guard with the exact status, body, and
 * (optional) log side-effect that branch produced before this refactor.
 * Order is preserved: the first matching guard wins, exactly as the
 * sequential if-chain did previously.
 */
const ERROR_MAPPINGS: ReadonlyArray<
  (err: FastifyError) => ErrorResponse | null
> = [
  (err) =>
    err instanceof IntegrationProfileNotFoundError
      ? {
          status: 404,
          body: { error: "NotFound", message: err.message, code: err.code },
        }
      : null,
  (err) =>
    err instanceof IntegrationTenantRequiredError
      ? { status: 400, body: { error: "BadRequest", message: err.message } }
      : null,
  (err) => {
    const gatewayErr = asAbdmGatewayError(err);
    if (!gatewayErr) return null;
    return {
      status:
        gatewayErr.statusCode >= 400 && gatewayErr.statusCode < 600
          ? gatewayErr.statusCode
          : 502,
      body: {
        error: "Upstream",
        message: formatNhaUpstreamMessage(gatewayErr),
        code: gatewayErr.abdmCode ?? null,
      },
      log: (request) =>
        request.log.warn(
          {
            statusCode: gatewayErr.statusCode,
            abdmCode: gatewayErr.abdmCode ?? null,
            responseBody: gatewayErr.responseBody,
          },
          "NHA gateway upstream error",
        ),
    };
  },
  (err) =>
    err instanceof TypeError && err.message.includes("fetch failed")
      ? {
          status: 503,
          body: {
            error: "Upstream",
            message:
              "NHA gateway unreachable (network timeout). Retry in a moment.",
            code: "GATEWAY_UNAVAILABLE",
          },
          log: (request) => request.log.warn({ err }, "upstream fetch failed"),
        }
      : null,
  (err) =>
    err instanceof AbdmUseCaseError
      ? {
          status: err.httpStatus,
          body: { error: err.clientCode, message: err.message },
        }
      : null,
  (err) =>
    err instanceof EnvelopeValidationError
      ? {
          status: 500,
          body: { error: "Internal Server Error", message: err.message },
          log: (request) =>
            request.log.error({ err }, "event envelope validation failed"),
        }
      : null,
  (err) =>
    err.code === "FST_ERR_CTP_INVALID_JSON_BODY" ||
    err.code === "FST_ERR_CTP_EMPTY_JSON_BODY"
      ? {
          status: 400,
          body: {
            error: "Bad Request",
            message:
              "Request body is not valid JSON. In Swagger, re-paste the body and remove trailing commas or smart quotes.",
            details: err.message,
          },
        }
      : null,
  (err) =>
    isFastifyValidationError(err)
      ? {
          status: 400,
          body: {
            error: "Bad Request",
            message: err.message,
            details:
              (err as FastifyError & { validation?: unknown }).validation ??
              null,
          },
        }
      : null,
  (err) => databaseErrorResponse(err),
];

/** Picks the database-unavailable message for a known PG failure mode. */
function databaseUnavailableMessage(pg: string): string {
  if (
    (pg.includes("abdm_sessions") || pg.includes("integration_hub")) &&
    pg.includes("does not exist")
  ) {
    return "Database schema missing — run: pnpm --filter @hims/integration-hub-svc db:migrate";
  }
  if (
    pg.includes("no authentication method") ||
    pg.includes("password authentication failed") ||
    pg.includes("SASL")
  ) {
    return "Database authentication failed — verify DATABASE_URL (postgresql://user:password@host:port/db?sslmode=require for Azure)";
  }
  return "Database unavailable";
}

function databaseErrorResponse(err: FastifyError): ErrorResponse | null {
  const pg = pgMessage(err);
  if (!pg) return null;
  return {
    status: 503,
    body: {
      error: "Service Unavailable",
      message: databaseUnavailableMessage(pg),
    },
    log: (request) => request.log.error({ err }, "database error"),
  };
}

export function registerHttpErrorHandler(app: {
  setErrorHandler: (
    handler: (
      error: FastifyError,
      request: FastifyRequest,
      reply: FastifyReply,
    ) => void | Promise<void>,
  ) => void;
}): void {
  app.setErrorHandler((err, request, reply) => {
    for (const mapping of ERROR_MAPPINGS) {
      const matched = mapping(err);
      if (matched) {
        matched.log?.(request, err);
        return reply.status(matched.status).send(matched.body);
      }
    }
    request.log.error({ err }, "unhandled error");
    return reply.status(500).send({
      error: "Internal Server Error",
      message: "Unexpected server error",
    });
  });
}
