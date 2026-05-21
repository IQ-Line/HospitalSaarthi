import type { FastifyInstance } from "fastify";
import type { UserManagementPluginOptions } from "@hims/user-management";
import { userManagementPlugin } from "@hims/user-management";
import { buildRouteSchemaTable, normalizeHttpMethod } from "./build-route-schema-table.js";
import { loadUserManagementOpenApiBundle } from "./load-openapi-bundle.js";

/**
 * Registers User Management under `/api/user-management` (OpenAPI `servers[0].url`) with
 * request JSON Schemas from the dereferenced OpenAPI bundle. Response contracts are checked in CI.
 */
export async function registerUserManagementApi(
  fastify: FastifyInstance,
  opts: UserManagementPluginOptions,
): Promise<void> {
  const bundle = await loadUserManagementOpenApiBundle();
  const routeSchemas = buildRouteSchemaTable(bundle);

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

      await scope.register(userManagementPlugin, opts);
    },
    { prefix: "/api/user-management" },
  );
}
