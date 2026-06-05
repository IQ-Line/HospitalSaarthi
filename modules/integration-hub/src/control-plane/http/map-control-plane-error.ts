import type { FastifyReply } from "fastify";
import { IntegrationHubControlPlaneError } from "../domain/integration-errors.js";

const STATUS_BY_CODE: Record<string, number> = {
  INTEGRATION_NOT_FOUND: 404,
  API_KEY_NOT_FOUND: 404,
  INTEGRATION_CONFLICT: 409,
  INTEGRATION_INVALID_STATE: 409,
  INTEGRATION_TYPE_UNKNOWN: 400,
  PARTNER_ORCHESTRATION_FAILED: 503,
};

export function replyWithControlPlaneError(
  reply: FastifyReply,
  error: IntegrationHubControlPlaneError,
  correlationId: string,
): void {
  const status = STATUS_BY_CODE[error.code] ?? 500;
  reply.code(status).send({
    code: error.code,
    message: error.message,
    correlation_id: correlationId,
  });
}
