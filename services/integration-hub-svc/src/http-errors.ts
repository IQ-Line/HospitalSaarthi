import type { FastifyError, FastifyReply, FastifyRequest } from "fastify";
import { EnvelopeValidationError } from "@hims/ts-sdk-events";
import {
  AbdmGatewayError,
  AbdmUseCaseError,
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
    if (err instanceof IntegrationProfileNotFoundError) {
      return reply.status(404).send({
        error: "NotFound",
        message: err.message,
        code: err.code,
      });
    }

    if (err instanceof IntegrationTenantRequiredError) {
      return reply.status(400).send({
        error: "BadRequest",
        message: err.message,
      });
    }

    if (err instanceof AbdmGatewayError) {
      const status =
        err.statusCode >= 400 && err.statusCode < 600 ? err.statusCode : 502;
      return reply.status(status).send({
        error: "Upstream",
        message: err.message,
        code: err.abdmCode ?? null,
      });
    }

    if (err instanceof TypeError && err.message.includes("fetch failed")) {
      request.log.warn({ err }, "upstream fetch failed");
      return reply.status(503).send({
        error: "Upstream",
        message: "NHA gateway unreachable (network timeout). Retry in a moment.",
        code: "GATEWAY_UNAVAILABLE",
      });
    }

    if (err instanceof AbdmUseCaseError) {
      return reply.status(err.httpStatus).send({
        error: err.clientCode,
        message: err.message,
      });
    }

    if (err instanceof EnvelopeValidationError) {
      request.log.error({ err }, "event envelope validation failed");
      return reply.status(500).send({
        error: "Internal Server Error",
        message: err.message,
      });
    }

    if (
      err.code === "FST_ERR_CTP_INVALID_JSON_BODY" ||
      err.code === "FST_ERR_CTP_EMPTY_JSON_BODY"
    ) {
      return reply.status(400).send({
        error: "Bad Request",
        message:
          "Request body is not valid JSON. In Swagger, re-paste the body and remove trailing commas or smart quotes.",
        details: err.message,
      });
    }

    if (isFastifyValidationError(err)) {
      return reply.status(400).send({
        error: "Bad Request",
        message: err.message,
        details: (err as FastifyError & { validation?: unknown }).validation ?? null,
      });
    }

    const pg = pgMessage(err);
    if (pg) {
      request.log.error({ err }, "database error");
      if (
        (pg.includes("abdm_sessions") || pg.includes("integration_hub")) &&
        pg.includes("does not exist")
      ) {
        return reply.status(503).send({
          error: "Service Unavailable",
          message:
            "Database schema missing — run: pnpm --filter @hims/integration-hub-svc db:migrate",
        });
      }
      if (
        pg.includes("no authentication method") ||
        pg.includes("password authentication failed") ||
        pg.includes("SASL")
      ) {
        return reply.status(503).send({
          error: "Service Unavailable",
          message:
            "Database authentication failed — verify DATABASE_URL (postgresql://user:password@host:port/db?sslmode=require for Azure)",
        });
      }
      return reply.status(503).send({
        error: "Service Unavailable",
        message: "Database unavailable",
      });
    }

    request.log.error({ err }, "unhandled error");
    return reply.status(500).send({
      error: "Internal Server Error",
      message: "Unexpected server error",
    });
  });
}
