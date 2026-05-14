import type { FastifyInstance } from "fastify";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { isApiDocsExposureEnabled } from "./is-api-docs-enabled.js";

export interface RegisterOpenApiDocsOptions {
  /** Short id for tagging (e.g. `configurator`). */
  serviceId: string;
  title: string;
  description?: string;
  version: string;
  /**
   * First OpenAPI `servers[].url` — use the HTTP mount path of the module API
   * (e.g. `/api/configurator/v1`) so “Try it out” resolves relative to the service.
   */
  apiPrefix?: string;
  /** Swagger UI mount path (default `/documentation`). */
  uiRoutePrefix?: string;
  /** Override env-based exposure (e.g. tests). */
  enabled?: boolean;
}

/**
 * Registers `@fastify/swagger` + `@fastify/swagger-ui`.
 * Call **before** route plugins that attach JSON Schema so the spec is complete.
 */
export async function registerOpenApiDocs(
  app: FastifyInstance,
  options: RegisterOpenApiDocsOptions,
): Promise<void> {
  const enabled = options.enabled ?? isApiDocsExposureEnabled();
  if (!enabled) return;

  const uiRoutePrefix = options.uiRoutePrefix ?? "/documentation";

  await app.register(swagger, {
    openapi: {
      openapi: "3.1.0",
      info: {
        title: options.title,
        ...(options.description !== undefined
          ? { description: options.description }
          : {}),
        version: options.version,
      },
      tags: [{ name: options.serviceId, description: `${options.title} routes` }],
      servers:
        options.apiPrefix !== undefined
          ? [{ url: options.apiPrefix }]
          : [{ url: "/" }],
    },
  });

  await app.register(swaggerUi, {
    routePrefix: uiRoutePrefix,
    uiConfig: {
      docExpansion: "list",
      deepLinking: true,
    },
  });
}
