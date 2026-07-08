import type { FastifyError, FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { AppError, type FieldViolation } from "./errors.js";
import { PROBLEM_CONTENT_TYPE, type ProblemDetails } from "./problem-details.js";

export interface ProblemErrorHandlerOptions {
  /**
   * How to read the correlation id off a request. Defaults to `request.correlationId`
   * (set by the observability/identity plugins) falling back to Fastify's `request.id`.
   */
  getCorrelationId?: (request: FastifyRequest) => string | undefined;
}

/** Request shape that MAY carry a correlation id, without depending on the augmentation. */
type MaybeCorrelated = FastifyRequest & { correlationId?: string };

function defaultGetCorrelationId(request: FastifyRequest): string | undefined {
  const cid = (request as MaybeCorrelated).correlationId;
  if (typeof cid === "string" && cid.length > 0) return cid;
  return request.id;
}

/** Fastify populates `error.validation` for AJV schema failures. */
function fastifyValidationViolations(error: FastifyError): FieldViolation[] | undefined {
  if (!Array.isArray(error.validation) || error.validation.length === 0) return undefined;
  return error.validation.map((v) => {
    // `instancePath` is like "/body/name"; strip the leading slash for readability.
    const path = typeof v.instancePath === "string" ? v.instancePath.replace(/^\//, "") : "";
    const field = path || (typeof v.params?.["missingProperty"] === "string" ? v.params["missingProperty"] : "");
    return { field, message: v.message ?? "invalid" };
  });
}

function send(reply: FastifyReply, problem: ProblemDetails, correlationId: string | undefined): void {
  if (correlationId !== undefined && problem.correlationId === undefined) {
    problem.correlationId = correlationId;
  }
  reply.code(problem.status).type(PROBLEM_CONTENT_TYPE).send(problem);
}

/**
 * Install a Fastify error handler that renders every error as RFC 7807
 * `application/problem+json`:
 *
 *  - `AppError` (and subclasses) → its own `toProblem()`.
 *  - Fastify/AJV validation errors → 400 with structured `errors`.
 *  - Other tagged 4xx `FastifyError`s (e.g. plugin-thrown 401/403) → passthrough problem.
 *  - Unmatched routes → 404 problem (via the not-found handler).
 *  - Anything else → generic 500 that never leaks internals (the real error is logged server-side).
 *
 * The correlation id is attached as an extension member and (via the instance)
 * ties the client-visible problem back to server logs.
 */
export function registerProblemErrorHandler(
  app: FastifyInstance,
  options: ProblemErrorHandlerOptions = {},
): void {
  const getCorrelationId = options.getCorrelationId ?? defaultGetCorrelationId;

  app.setNotFoundHandler((request, reply) => {
    send(
      reply,
      {
        type: "urn:hims:error:not_found",
        title: "Resource Not Found",
        status: 404,
        code: "ROUTE_NOT_FOUND",
        detail: `Route ${request.method} ${request.url} not found`,
        instance: request.url,
      },
      getCorrelationId(request),
    );
  });

  app.setErrorHandler((error: FastifyError, request, reply) => {
    const instance = request.url;
    const correlationId = getCorrelationId(request);

    if (error instanceof AppError) {
      send(reply, error.toProblem(instance), correlationId);
      return;
    }

    const violations = fastifyValidationViolations(error);
    if (violations) {
      send(
        reply,
        {
          type: "urn:hims:error:validation_failed",
          title: "Validation Failed",
          status: 400,
          code: "VALIDATION_FAILED",
          detail: error.message,
          instance,
          errors: violations,
        },
        correlationId,
      );
      return;
    }

    const statusCode = typeof error.statusCode === "number" ? error.statusCode : 500;

    // Known, safe client errors (4xx) may pass their message + code through.
    if (statusCode >= 400 && statusCode < 500) {
      send(
        reply,
        {
          type: "urn:hims:error:request_error",
          title: error.name && error.name !== "Error" ? error.name : "Request Error",
          status: statusCode,
          code: typeof error.code === "string" && error.code.length > 0 ? error.code : "REQUEST_ERROR",
          detail: error.message,
          instance,
        },
        correlationId,
      );
      return;
    }

    // Unknown / 5xx: log the real error, return an opaque body — never leak internals.
    request.log.error({ err: error, correlationId }, "Unhandled error");
    send(
      reply,
      {
        type: "urn:hims:error:internal",
        title: "Internal Server Error",
        status: 500,
        code: "INTERNAL_ERROR",
        detail: "An unexpected error occurred.",
        instance,
      },
      correlationId,
    );
  });
}
