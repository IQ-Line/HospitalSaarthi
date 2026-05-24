import type { FastifyInstance, FastifyRequest } from "fastify";
import fp from "fastify-plugin";

const REDACTED_HEADERS = new Set([
  "authorization",
  "proxy-authorization",
  "cookie",
  "set-cookie",
  "x-api-key",
  "x-auth-token",
]);

const REDACTED_VALUE = "[REDACTED]";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const DEFAULT_SKIP_PATH_PREFIXES = [
  "/docs",
  "/redoc",
  "/openapi.json",
  "/favicon.ico",
  "/healthz",
  "/readyz",
  "/livez",
];

type RequestLogContext = {
  requestId: string;
  startedAt: number;
  skipped: boolean;
  requestLogged: boolean;
};

const requestContextStore = new WeakMap<FastifyRequest, RequestLogContext>();
const responseBodyStore = new WeakMap<FastifyRequest, string>();

export type RequestLoggingPluginOptions = {
  /** Path prefixes excluded from request/response logging. */
  skipPathPrefixes?: readonly string[];
  /** When true, log decoded request body (truncated). Default false. */
  logRequestBody?: boolean;
  /** Maximum bytes of request/error-response body to capture. Default 4096. */
  maxBodyBytes?: number;
  /** Optional sink for tests or services that want to redirect formatted lines. */
  logLine?: (line: string) => void;
};

type ResolvedRequestLoggingPluginOptions = Required<
  Omit<RequestLoggingPluginOptions, "logLine">
> & {
  logLine: (line: string) => void;
};

function normalizePathPrefix(prefix: string): string {
  const raw = prefix.split("?")[0] ?? "";
  if (raw.length > 1 && raw.endsWith("/")) {
    return raw.slice(0, -1);
  }
  return raw;
}

function requestPath(url: string): string {
  const raw = url.split("?")[0] ?? "/";
  if (raw.length > 1 && raw.endsWith("/")) {
    return raw.slice(0, -1);
  }
  return raw;
}

function requestQuery(url: string): string {
  const idx = url.indexOf("?");
  return idx >= 0 ? url.slice(idx + 1) : "";
}

function shouldSkipPath(path: string, skipPathPrefixes: readonly string[]): boolean {
  for (const prefix of skipPathPrefixes) {
    const normalized = normalizePathPrefix(prefix);
    if (normalized.length === 0) continue;
    if (path === normalized || path.startsWith(`${normalized}/`)) {
      return true;
    }
  }
  return false;
}

function resolveRequestIdFromHeader(headerValue: unknown): string | null {
  if (typeof headerValue !== "string") {
    return null;
  }
  const candidate = headerValue.trim();
  if (candidate.length === 0 || candidate.length > 64) {
    return null;
  }
  if (!UUID_RE.test(candidate)) {
    return null;
  }
  return candidate;
}

function resolveRequestId(request: FastifyRequest): string {
  const fromHeader = resolveRequestIdFromHeader(request.headers["x-request-id"]);
  if (fromHeader !== null) {
    return fromHeader;
  }
  return request.id;
}

function decodeHeaders(
  headers: Record<string, string | string[] | undefined>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [name, value] of Object.entries(headers)) {
    if (value === undefined) continue;
    const key = name.toLowerCase();
    const normalized = Array.isArray(value) ? value.join(", ") : value;
    Object.defineProperty(out, key, {
      enumerable: true,
      configurable: true,
      value: REDACTED_HEADERS.has(key) ? REDACTED_VALUE : normalized,
    });
  }
  return out;
}

function formatHeaders(headers: Record<string, string>): string {
  if (Object.keys(headers).length === 0) {
    return "{}";
  }
  return JSON.stringify(Object.fromEntries(Object.entries(headers).sort(([a], [b]) => a.localeCompare(b))));
}

function isTextLike(contentType: string | undefined): boolean {
  if (!contentType) return false;
  const ct = contentType.toLowerCase();
  return (
    ct.includes("json") ||
    ct.includes("text") ||
    ct.includes("xml") ||
    ct.includes("form-urlencoded") ||
    ct.includes("yaml")
  );
}

function formatBodyBytes(body: Buffer, contentType: string | undefined, maxBytes: number): string {
  if (body.length === 0) {
    return "";
  }
  if (!isTextLike(contentType)) {
    return `<binary ${body.length} bytes>`;
  }
  const truncated = body.length > maxBytes;
  const snippet = body.subarray(0, maxBytes).toString("utf8");
  return truncated ? `${snippet} ...[truncated ${body.length} bytes]` : snippet;
}

function formatBodyValue(value: unknown, contentType: string | undefined, maxBytes: number): string {
  if (value === undefined || value === null) {
    return "";
  }
  if (typeof value === "string") {
    return formatBodyBytes(Buffer.from(value), contentType, maxBytes);
  }
  if (Buffer.isBuffer(value)) {
    return formatBodyBytes(value, contentType, maxBytes);
  }
  if (typeof value === "object") {
    return formatBodyBytes(Buffer.from(JSON.stringify(value)), contentType ?? "application/json", maxBytes);
  }
  return formatBodyBytes(Buffer.from(String(value)), contentType, maxBytes);
}

function formatBodyInline(bodyText: string): string {
  return bodyText.length > 0 ? bodyText : "(empty)";
}

function shouldLogResponseBody(statusCode: number): boolean {
  return statusCode < 200 || statusCode > 300;
}

function formatOffset(minutesEastOfUtc: number): string {
  const sign = minutesEastOfUtc >= 0 ? "+" : "-";
  const abs = Math.abs(minutesEastOfUtc);
  const hours = Math.floor(abs / 60).toString().padStart(2, "0");
  const minutes = (abs % 60).toString().padStart(2, "0");
  return `${sign}${hours}${minutes}`;
}

function formatTimestamp(date = new Date()): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const seconds = date.getSeconds().toString().padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${formatOffset(
    -date.getTimezoneOffset(),
  )}`;
}

function defaultLogLine(line: string): void {
  process.stdout.write(`${line}\n`);
}

function emitRequestLog(
  options: ResolvedRequestLoggingPluginOptions,
  requestId: string,
  message: string,
): void {
  options.logLine(`${formatTimestamp()} INFO [${requestId}] app.requests: ${message}`);
}

function clientAddress(request: FastifyRequest): string {
  return request.ip ?? "-";
}

function getOrCreateContext(request: FastifyRequest): RequestLogContext {
  const existing = requestContextStore.get(request);
  if (existing) {
    return existing;
  }
  const created: RequestLogContext = {
    requestId: resolveRequestId(request),
    startedAt: performance.now(),
    skipped: false,
    requestLogged: false,
  };
  requestContextStore.set(request, created);
  return created;
}

function logIncomingRequest(
  request: FastifyRequest,
  options: ResolvedRequestLoggingPluginOptions,
): void {
  const ctx = getOrCreateContext(request);
  if (ctx.skipped || ctx.requestLogged) {
    return;
  }

  const path = requestPath(request.url);
  const query = requestQuery(request.url);
  const headers = decodeHeaders(request.headers);
  const contentType = headers["content-type"];
  const bodyText = options.logRequestBody
    ? formatBodyValue(request.body, contentType, options.maxBodyBytes)
    : "";
  const queryText = query.length > 0 ? `?${query}` : "";

  emitRequestLog(
    options,
    ctx.requestId,
    `--> ${request.method} ${path}${queryText} client=${clientAddress(
      request,
    )} headers=${formatHeaders(headers)} body=${formatBodyInline(bodyText)}`,
  );

  ctx.requestLogged = true;
}

async function requestLoggingPluginFn(
  fastify: FastifyInstance,
  options: RequestLoggingPluginOptions = {},
): Promise<void> {
  const resolved: ResolvedRequestLoggingPluginOptions = {
    skipPathPrefixes: options.skipPathPrefixes ?? DEFAULT_SKIP_PATH_PREFIXES,
    logRequestBody: options.logRequestBody ?? false,
    maxBodyBytes: Math.max(0, options.maxBodyBytes ?? 4096),
    logLine: options.logLine ?? defaultLogLine,
  };

  fastify.addHook("onRequest", async (request, reply) => {
    const path = requestPath(request.url);
    const ctx = getOrCreateContext(request);
    reply.header("x-request-id", ctx.requestId);
    ctx.skipped = shouldSkipPath(path, resolved.skipPathPrefixes);
    if (ctx.skipped) {
      return;
    }
    if (!resolved.logRequestBody) {
      logIncomingRequest(request, resolved);
    }
  });

  fastify.addHook("preHandler", async (request) => {
    const ctx = requestContextStore.get(request);
    if (!ctx || ctx.skipped || !resolved.logRequestBody) {
      return;
    }
    logIncomingRequest(request, resolved);
  });

  fastify.addHook("onSend", async (request, reply, payload) => {
    const ctx = requestContextStore.get(request);
    if (!ctx || ctx.skipped || resolved.maxBodyBytes <= 0) {
      return payload;
    }
    if (!shouldLogResponseBody(reply.statusCode)) {
      return payload;
    }

    const contentTypeRaw = reply.getHeader("content-type");
    let contentType: string | undefined;
    if (typeof contentTypeRaw === "string") {
      contentType = contentTypeRaw;
    } else if (Array.isArray(contentTypeRaw)) {
      contentType = contentTypeRaw.join(", ");
    }

    if (payload === null || payload === undefined) {
      responseBodyStore.set(request, "");
      return payload;
    }

    if (typeof payload === "string") {
      responseBodyStore.set(
        request,
        formatBodyBytes(Buffer.from(payload), contentType, resolved.maxBodyBytes),
      );
      return payload;
    }

    if (Buffer.isBuffer(payload)) {
      responseBodyStore.set(request, formatBodyBytes(payload, contentType, resolved.maxBodyBytes));
      return payload;
    }

    if (typeof payload === "object") {
      responseBodyStore.set(
        request,
        formatBodyBytes(
          Buffer.from(JSON.stringify(payload)),
          contentType ?? "application/json",
          resolved.maxBodyBytes,
        ),
      );
      return payload;
    }

    responseBodyStore.set(
      request,
      formatBodyBytes(Buffer.from(String(payload)), contentType, resolved.maxBodyBytes),
    );
    return payload;
  });

  fastify.addHook("onResponse", async (request, reply) => {
    const ctx = requestContextStore.get(request);
    if (!ctx || ctx.skipped) {
      return;
    }

    const path = requestPath(request.url);
    const durationMs = Math.round((performance.now() - ctx.startedAt) * 100) / 100;
    const headers = decodeHeaders(reply.getHeaders() as Record<string, string | string[] | undefined>);
    const responseBodyText =
      shouldLogResponseBody(reply.statusCode) && resolved.maxBodyBytes > 0
        ? (responseBodyStore.get(request) ?? "")
        : "";

    emitRequestLog(
      resolved,
      ctx.requestId,
      `<-- ${reply.statusCode} ${request.method} ${path} ${durationMs.toFixed(
        2,
      )}ms headers=${formatHeaders(headers)} body=${formatBodyInline(responseBodyText)}`,
    );
  });
}

export const requestLoggingPlugin = fp(requestLoggingPluginFn, {
  fastify: "5.x",
  name: "@hims/ts-sdk-http/request-logging",
});
