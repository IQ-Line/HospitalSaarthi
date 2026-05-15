import type { FastifyInstance, FastifyRequest } from "fastify";
import type { UserManagementPluginOptions } from "@hims/user-management";
import { userManagementPlugin } from "@hims/user-management";
import {
  buildRouteSchemaTable,
  createResponseValidatorTable,
  normalizeHttpMethod,
} from "./build-route-schema-table.js";
import { loadUserManagementOpenApiBundle } from "./load-openapi-bundle.js";

function routeSchemaLookupKey(request: FastifyRequest): string {
  const method = request.method.toUpperCase();
  const url = request.routeOptions?.url ?? "";
  return `${method}:${url}`;
}

/**
 * Registers User Management under `/api/user-management` (OpenAPI `servers[0].url`) with:
 * - request/response JSON Schemas attached from the dereferenced OpenAPI bundle (Fastify + Ajv)
 * - optional success-response validation in `preSerialization`
 */
export async function registerUserManagementApi(
  fastify: FastifyInstance,
  opts: UserManagementPluginOptions,
): Promise<void> {
  const bundle = await loadUserManagementOpenApiBundle();
  const routeSchemas = buildRouteSchemaTable(bundle);
  const responseValidators = createResponseValidatorTable(routeSchemas);

  await fastify.register(
    async (scope) => {
      scope.addHook("onRoute", (routeOptions) => {
        const method = normalizeHttpMethod(routeOptions.method);
        const url = routeOptions.url ?? "";
        const entry = routeSchemas.get(`${method}:${url}`);
        if (!entry) return;
        const existing = routeOptions.schema;
        routeOptions.schema = {
          ...(existing && typeof existing === "object" ? existing : {}),
          ...entry.schema,
        };
      });

      scope.addHook("preSerialization", async (request, reply, payload) => {
        const code = reply.statusCode;
        if (code !== 200 && code !== 201) return payload;
        if (payload === null || typeof payload !== "object") return payload;
        const key = routeSchemaLookupKey(request);
        const validators = responseValidators.get(key);
        if (!validators) return payload;
        const validate = validators.get(code);
        if (!validate) return payload;
        if (!validate(payload)) {
          request.log.error(
            { errors: validate.errors, route: key },
            "OpenAPI response validation failed",
          );
          throw new Error("OPENAPI_RESPONSE_VALIDATION_FAILED");
        }
        return payload;
      });

      await scope.register(userManagementPlugin, opts);
    },
    { prefix: "/api/user-management" },
  );
}
