import { ABDM_ERROR_CODES, type AbdmErrorCode } from "@hims/ts-sdk-abha";

/** Non-2xx or malformed response from NHA gateway / ABHA API. */
export class AbdmGatewayError extends Error {
  readonly statusCode: number;
  readonly abdmCode?: AbdmErrorCode | string;
  readonly responseBody?: unknown;

  constructor(
    message: string,
    options: {
      statusCode: number;
      abdmCode?: AbdmErrorCode | string;
      responseBody?: unknown;
    },
  ) {
    super(message);
    this.name = "AbdmGatewayError";
    this.statusCode = options.statusCode;
    this.abdmCode = options.abdmCode;
    this.responseBody = options.responseBody;
  }
}

export function parseNhaErrorBody(body: unknown): {
  code?: string;
  message?: string;
} {
  if (!body || typeof body !== "object") return {};
  const o = body as Record<string, unknown>;
  const err = o["error"];
  if (err && typeof err === "object") {
    const e = err as Record<string, unknown>;
    return {
      code: typeof e["code"] === "string" ? e["code"] : undefined,
      message: typeof e["message"] === "string" ? e["message"] : undefined,
    };
  }
  const topMessage = o["message"];
  const topCode = o["code"];
  if (typeof topMessage === "string" || typeof topCode === "string") {
    return {
      code: typeof topCode === "string" ? topCode : undefined,
      message: typeof topMessage === "string" ? topMessage : undefined,
    };
  }
  return {};
}

export function gatewayUnavailable(message: string, statusCode: number, body: unknown) {
  return new AbdmGatewayError(message, {
    statusCode,
    abdmCode: ABDM_ERROR_CODES.GATEWAY_UNAVAILABLE,
    responseBody: body,
  });
}
