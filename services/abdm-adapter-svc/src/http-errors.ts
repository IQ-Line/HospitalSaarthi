import type { FastifyError, FastifyReply, FastifyRequest } from "fastify";
import { AbdmGatewayError, AbdmUseCaseError } from "@hims/abdm-adapter";

function pgMessage(err: unknown): string | null {
  if (!err || typeof err !== "object") return null;
  const o = err as { message?: unknown; cause?: unknown };
  if (typeof o.message === "string" && o.message.includes("Failed query")) {
    const cause = o.cause;
    if (cause && typeof cause === "object" && "message" in cause) {
      const cm = (cause as { message?: unknown }).message;
      if (typeof cm === "string") return cm;
    }
  }
  if (typeof o.message === "string" && !o.message.includes("Failed query")) {
    return o.message;
  }
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
    if (err instanceof AbdmGatewayError) {
      const status =
        err.statusCode >= 400 && err.statusCode < 600 ? err.statusCode : 502;
      return reply.status(status).send({
        error: "Upstream",
        message: err.message,
        code: err.abdmCode ?? null,
      });
    }

    if (err instanceof AbdmUseCaseError) {
      return reply.status(err.httpStatus).send({
        error: err.clientCode,
        message: err.message,
      });
    }

    const pg = pgMessage(err);
    if (pg) {
      request.log.error({ err }, "database error");
      if (pg.includes("abdm_sessions") && pg.includes("does not exist")) {
        return reply.status(503).send({
          error: "Service Unavailable",
          message:
            "Database schema missing — run: pnpm --filter @hims/abdm-adapter-svc db:migrate",
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
