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

/** Duck-type guard — `instanceof` can fail across duplicate ESM class identities in dev. */
export function isAbdmGatewayError(err: unknown): err is AbdmGatewayError {
  if (err instanceof AbdmGatewayError) return true;
  if (typeof err !== "object" || err === null) return false;
  const o = err as { name?: unknown; statusCode?: unknown };
  return o.name === "AbdmGatewayError" && typeof o.statusCode === "number";
}

export function asAbdmGatewayError(err: unknown): AbdmGatewayError | null {
  return isAbdmGatewayError(err) ? err : null;
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
  // NHA validation shape: { "loginHint": "Invalid Login Hint", "timestamp": "..." }
  const fieldMessages = Object.entries(o)
    .filter(([k, v]) => k !== "timestamp" && typeof v === "string" && v.length > 0)
    .map(([k, v]) => `${k}: ${v}`);
  if (fieldMessages.length > 0) {
    return { message: fieldMessages.join("; ") };
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

/** Prefer NHA `error.message` over generic HTTP status text (e.g. "Bad Request"). */
export function formatNhaUpstreamMessage(err: AbdmGatewayError): string {
  const parsed = parseNhaErrorBody(err.responseBody);
  if (parsed.message) return parsed.message;
  if (err.message && !/^(bad request|unauthorized|forbidden|not found)$/i.test(err.message.trim())) {
    return err.message;
  }
  return err.message;
}
