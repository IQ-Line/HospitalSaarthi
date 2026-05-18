import Ajv, { type ValidateFunction } from "ajv";
import addFormats from "ajv-formats";

/** OpenAPI `{id}` path segments → Fastify `:id` patterns (must match `routeOptions.url`). */
export function openapiPathToFastify(openapiPath: string): string {
  return openapiPath.replace(/\{([^}]+)\}/g, ":$1");
}

export function normalizeHttpMethod(method: string | string[] | undefined): string {
  if (method === undefined) return "GET";
  const m = Array.isArray(method) ? method[0] : method;
  return String(m).toUpperCase();
}

type PathItem = Record<string, unknown>;

/**
 * Builds Fastify route `schema` objects (body / params / response) from a dereferenced OpenAPI bundle.
 */
export function buildRouteSchemaTable(bundle: Record<string, unknown>): Map<
  string,
  { schema: Record<string, unknown> }
> {
  const paths = bundle.paths as Record<string, PathItem> | undefined;
  const out = new Map<string, { schema: Record<string, unknown> }>();
  if (!paths) return out;

  const servers = bundle.servers as Array<{ url?: string }> | undefined;
  /** OpenAPI `servers[0].url` + path item — matches Fastify `routeOptions.url` under that mount. */
  const pathPrefix = (servers?.[0]?.url ?? "").replace(/\/+$/, "");

  const httpMethods = ["get", "post", "put", "patch", "delete"] as const;

  for (const [openPath, pathItem] of Object.entries(paths)) {
    const fastPath = openapiPathToFastify(openPath);
    const routeUrl = `${pathPrefix}${fastPath}`;
    for (const method of httpMethods) {
      const op = pathItem[method];
      if (op === null || op === undefined || typeof op !== "object") continue;
      const methodU = method.toUpperCase();
      const schema: Record<string, unknown> = {};

      const parameters = op.parameters as
        | Array<{ in?: string; name?: string; required?: boolean; schema?: unknown }>
        | undefined;
      if (parameters?.length) {
        const pathProps: Record<string, unknown> = {};
        const pathRequired: string[] = [];
        const queryProps: Record<string, unknown> = {};
        const queryRequired: string[] = [];
        for (const p of parameters) {
          if (typeof p.name !== "string") continue;
          const propSchema = p.schema ?? { type: "string" };
          if (p.in === "path") {
            pathProps[p.name] = propSchema;
            if (p.required) pathRequired.push(p.name);
          } else if (p.in === "query") {
            queryProps[p.name] = propSchema;
            if (p.required) queryRequired.push(p.name);
          }
        }
        if (Object.keys(pathProps).length > 0) {
          schema.params = {
            type: "object",
            required: pathRequired,
            properties: pathProps,
            additionalProperties: false,
          };
        }
        if (Object.keys(queryProps).length > 0) {
          schema.querystring = {
            type: "object",
            required: queryRequired,
            properties: queryProps,
            additionalProperties: false,
          };
        }
      }

      const requestBody = op.requestBody as
        | { content?: Record<string, { schema?: unknown }> }
        | undefined;
      const jsonBody = requestBody?.content?.["application/json"];
      if (jsonBody?.schema !== undefined) {
        schema.body = jsonBody.schema;
      }

      // Response bodies are validated in CI (`capability-response-validation.test.ts`, etc.)
      // and via the preSerialization hook (log-only). Do not attach `schema.response` here —
      // Fastify response serializers reject some valid OpenAPI nullable shapes at runtime.

      if (Object.keys(schema).length > 0) {
        out.set(`${methodU}:${routeUrl}`, { schema });
      }
    }
  }

  return out;
}

/** Compiles OpenAPI success response schemas for log-only runtime checks (CI + preSerialization). */
export function createResponseValidatorTable(
  bundle: Record<string, unknown>,
): Map<string, Map<number, ValidateFunction>> {
  const ajv = new Ajv({
    allErrors: true,
    strict: false,
    allowUnionTypes: true,
  });
  addFormats(ajv);

  const paths = bundle.paths as Record<string, PathItem> | undefined;
  const table = new Map<string, Map<number, ValidateFunction>>();
  if (!paths) return table;

  const servers = bundle.servers as Array<{ url?: string }> | undefined;
  const pathPrefix = (servers?.[0]?.url ?? "").replace(/\/+$/, "");
  const httpMethods = ["get", "post", "put", "patch", "delete"] as const;

  for (const [openPath, pathItem] of Object.entries(paths)) {
    const routeUrl = `${pathPrefix}${openapiPathToFastify(openPath)}`;
    for (const method of httpMethods) {
      const op = pathItem[method];
      if (op === null || op === undefined || typeof op !== "object") continue;
      const responses = op.responses as
        | Record<string, { content?: Record<string, { schema?: unknown }> }>
        | undefined;
      if (!responses) continue;

      const inner = new Map<number, ValidateFunction>();
      for (const [code, resp] of Object.entries(responses)) {
        if (!/^\d{3}$/.test(code)) continue;
        const n = Number(code);
        if (n !== 200 && n !== 201) continue;
        const sch = resp?.content?.["application/json"]?.schema;
        if (sch !== undefined) {
          inner.set(n, ajv.compile(sch));
        }
      }
      if (inner.size > 0) {
        table.set(`${method.toUpperCase()}:${routeUrl}`, inner);
      }
    }
  }

  return table;
}
