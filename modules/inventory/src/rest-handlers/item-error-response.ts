import type { FastifyReply } from "fastify";
import { ZodError } from "zod";
import { InventoryError } from "../errors.js";
import {
  isPostgresForeignKeyViolation,
  isPostgresUniqueViolation,
} from "../lib/postgres-errors.js";

function zodErrorMessage(error: ZodError): string {
  const first = error.issues[0];
  return first?.message ?? "Invalid request body";
}

export function sendItemHandlerError(reply: FastifyReply, error: unknown): FastifyReply {
  if (error instanceof InventoryError) {
    return reply.code(error.statusCode).send({
      message: error.message,
      ...(error.code ? { code: error.code } : {}),
    });
  }

  if (error instanceof ZodError) {
    return reply.code(422).send({
      message: zodErrorMessage(error),
      code: "VALIDATION_ERROR",
    });
  }

  if (isPostgresUniqueViolation(error)) {
    return reply.code(409).send({
      message: "An item with the same unique key already exists",
      code: "CONFLICT",
    });
  }

  if (isPostgresForeignKeyViolation(error)) {
    return reply.code(422).send({
      message: "One or more referenced master records were not found",
      code: "INVALID_REFERENCE",
    });
  }

  if (error instanceof Error) {
    return reply.code(500).send({
      message: "Failed to create item",
      code: "INTERNAL_ERROR",
    });
  }

  return reply.code(500).send({
    message: "Failed to create item",
    code: "INTERNAL_ERROR",
  });
}
