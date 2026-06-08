import type { FastifyReply } from "fastify";
import {
  IntegrationApiKeyNotFoundError,
  IntegrationNotFoundError,
  IntegrationStateError,
  IntegrationValidationError,
  PartnerOrchestrationError,
} from "../domain/errors.js";
import { InvalidAllowedOperationsError } from "../domain/partner-exposed-operations.js";

type ErrorBody = {
  code: string;
  message?: string;
  correlation_id?: string;
};

function send(
  reply: FastifyReply,
  status: number,
  code: string,
  message: string | undefined,
  correlationId: string | undefined,
): void {
  const body: ErrorBody = { code };
  if (message !== undefined) body.message = message;
  if (correlationId !== undefined && correlationId.length > 0) {
    body.correlation_id = correlationId;
  }
  void reply.code(status).send(body);
}

export function replyWithControlPlaneError(
  reply: FastifyReply,
  err: unknown,
  correlationId?: string,
): void {
  if (err instanceof IntegrationNotFoundError) {
    send(reply, 404, err.code, err.message, correlationId);
    return;
  }
  if (err instanceof IntegrationApiKeyNotFoundError) {
    send(reply, 404, err.code, err.message, correlationId);
    return;
  }
  if (err instanceof IntegrationValidationError || err instanceof InvalidAllowedOperationsError) {
    send(
      reply,
      400,
      err instanceof IntegrationValidationError ? err.code : err.code,
      err.message,
      correlationId,
    );
    return;
  }
  if (err instanceof IntegrationStateError) {
    send(reply, 409, err.code, err.message, correlationId);
    return;
  }
  if (err instanceof PartnerOrchestrationError) {
    send(reply, 502, err.code, err.message, correlationId);
    return;
  }
  throw err;
}
