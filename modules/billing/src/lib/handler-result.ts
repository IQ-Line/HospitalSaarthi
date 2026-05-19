import type { FastifyReply } from "fastify";
import type { UseCaseErrorCode, UseCaseResult } from "../domain/bill.types.js";

const HTTP: Record<UseCaseErrorCode, number> = {
  NOT_FOUND: 404,
  CONFLICT: 409,
  VALIDATION: 400,
};

const LABEL: Record<number, string> = {
  400: "Bad Request",
  404: "Not Found",
  409: "Conflict",
};

type SendOptions<T, U> = {
  successCode?: number;
  wrapData?: boolean;
  mapSuccess?: (data: T) => U;
};

/** Maps use-case results to HTTP (tariff + billing share the same error shape). */
export function sendUseCaseResult<T, U = T>(
  reply: FastifyReply,
  result: UseCaseResult<T>,
  successCodeOrOptions: number | SendOptions<T, U> = 200,
  wrapData = true,
) {
  const opts: SendOptions<T, U> =
    typeof successCodeOrOptions === "number"
      ? { successCode: successCodeOrOptions, wrapData }
      : successCodeOrOptions;
  const { successCode = 200, wrapData: wrap = true, mapSuccess } = opts;

  if (!result.ok) {
    const status = HTTP[result.code];
    return reply.code(status).send({
      statusCode: status,
      error: LABEL[status],
      message: result.message,
    });
  }

  const payload = mapSuccess ? mapSuccess(result.data) : result.data;
  if (successCode === 201 && !wrap) return reply.code(201).send(payload);
  return reply.code(successCode).send(wrap ? { data: payload } : payload);
}
