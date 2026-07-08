import { createRequire } from "node:module";
import { Ajv, type Schema, type ValidateFunction } from "ajv";
import { stripTrailingSlashes } from "../lib/strip-trailing-slashes.js";

/**
 * ajv-formats is a CJS package whose callable default export trips NodeNext's ESM↔CJS interop
 * (the default resolves to the module namespace rather than the function). createRequire returns
 * `module.exports` — the callable plugin — directly.
 */
const addFormats = createRequire(import.meta.url)("ajv-formats") as (ajv: Ajv) => Ajv;

/** OpenAPI `{id}` path segments → Fastify `:id` patterns (must match `routeOptions.url`). */
export function openapiPathToFastify(openapiPath: string): string {
  // eslint-disable-next-line sonarjs/slow-regex -- linear: `[^}]+` is bounded by the excluded `}`, no nested quantifier; not ReDoS
  return openapiPath.replace(/\{([^}]+)\}/g, ":$1");
}

export function normalizeHttpMethod(method: string | string[] | undefined): string {
  if (method === undefined) return "GET";
  const m = Array.isArray(method) ? method[0] : method;
  return String(m).toUpperCase();
}

type PathItem = Record<string, unknown>;

const HTTP_METHODS = ["get", "post", "put", "patch", "delete"] as const;

/** OpenAPI `servers[0].url` (trailing slashes stripped) — matches the Fastify mount prefix. */
function getPathPrefix(bundle: Record<string, unknown>): string {
  const servers = bundle.servers as Array<{ url?: string }> | undefined;
  return stripTrailingSlashes(servers?.[0]?.url ?? "");
}

type Operation = {
  openPath: string;
  routeUrl: string;
  method: (typeof HTTP_METHODS)[number];
  methodU: string;
  op: Record<string, unknown>;
};

/**
 * Walks every (path × HTTP method) pair in a dereferenced bundle, yielding only the entries that
 * carry a real operation object. Centralizes the prefix/url and operation-object guard shared by
 * both schema-table builders.
 */
function* iterateOperations(bundle: Record<string, unknown>): Generator<Operation> {
  const paths = bundle.paths as Record<string, PathItem> | undefined;
  if (!paths) return;
  const pathPrefix = getPathPrefix(bundle);

  for (const [openPath, pathItem] of Object.entries(paths)) {
    const routeUrl = `${pathPrefix}${openapiPathToFastify(openPath)}`;
    for (const [rawMethod, opRaw] of Object.entries(pathItem)) {
      if (!(HTTP_METHODS as readonly string[]).includes(rawMethod)) continue;
      const method = rawMethod as (typeof HTTP_METHODS)[number];
      if (opRaw === null || opRaw === undefined || typeof opRaw !== "object") continue;
      yield { openPath, routeUrl, method, methodU: method.toUpperCase(), op: opRaw as Record<string, unknown> };
    }
  }
}

type OpenApiParameter = { in?: string; name?: string; required?: boolean; schema?: unknown };

/** A JSON-schema `object` node built from a set of OpenAPI parameters sharing an `in` location. */
function objectSchema(properties: Record<string, unknown>, required: string[]): Record<string, unknown> {
  return { type: "object", required, properties, additionalProperties: false };
}

/**
 * Translates OpenAPI `parameters` into Fastify `params` / `querystring` schemas, grouping by the
 * parameter's `in` location. Returns only the locations that actually have parameters.
 */
function buildParameterSchemas(
  parameters: OpenApiParameter[],
): { params?: Record<string, unknown>; querystring?: Record<string, unknown> } {
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

  const result: { params?: Record<string, unknown>; querystring?: Record<string, unknown> } = {};
  if (Object.keys(pathProps).length > 0) result.params = objectSchema(pathProps, pathRequired);
  if (Object.keys(queryProps).length > 0) result.querystring = objectSchema(queryProps, queryRequired);
  return result;
}

/** Builds the Fastify route `schema` (params / querystring / body) for one OpenAPI operation. */
function buildOperationSchema(op: Record<string, unknown>): Record<string, unknown> {
  const schema: Record<string, unknown> = {};

  const parameters = op.parameters as OpenApiParameter[] | undefined;
  if (parameters?.length) {
    const { params, querystring } = buildParameterSchemas(parameters);
    if (params) schema.params = params;
    if (querystring) schema.querystring = querystring;
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

  return schema;
}

/**
 * Builds Fastify route `schema` objects (body / params / response) from a dereferenced OpenAPI bundle.
 */
export function buildRouteSchemaTable(bundle: Record<string, unknown>): Map<
  string,
  { schema: Record<string, unknown> }
> {
  const out = new Map<string, { schema: Record<string, unknown> }>();

  for (const { routeUrl, methodU, op } of iterateOperations(bundle)) {
    const schema = buildOperationSchema(op);
    if (Object.keys(schema).length > 0) {
      out.set(`${methodU}:${routeUrl}`, { schema });
    }
  }

  return out;
}

/** Compiles the JSON success responses (200/201) of one operation into AJV validators. */
function compileSuccessValidators(
  op: Record<string, unknown>,
  ajv: Ajv,
): Map<number, ValidateFunction> {
  const responses = op.responses as
    | Record<string, { content?: Record<string, { schema?: Schema }> }>
    | undefined;
  const inner = new Map<number, ValidateFunction>();
  if (!responses) return inner;

  for (const [code, resp] of Object.entries(responses)) {
    if (!/^\d{3}$/.test(code)) continue;
    const n = Number(code);
    if (n !== 200 && n !== 201) continue;
    const sch = resp?.content?.["application/json"]?.schema;
    if (sch !== undefined) {
      inner.set(n, ajv.compile(sch));
    }
  }
  return inner;
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

  const table = new Map<string, Map<number, ValidateFunction>>();

  for (const { routeUrl, methodU, op } of iterateOperations(bundle)) {
    const inner = compileSuccessValidators(op, ajv);
    if (inner.size > 0) {
      table.set(`${methodU}:${routeUrl}`, inner);
    }
  }

  return table;
}
