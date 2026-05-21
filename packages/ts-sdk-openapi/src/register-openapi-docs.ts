import path from "node:path";
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
  /** Swagger UI mount path (default `/docs`, same convention as master-data FastAPI). */
  uiRoutePrefix?: string;
  /** Override env-based exposure (e.g. tests). */
  enabled?: boolean;
  /**
   * When set, serve this OpenAPI file (YAML/JSON) as the Swagger document instead of
   * generating from route schemas. `baseDir` is the directory containing `path`.
   */
  staticSpec?: { path: string; baseDir: string };
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

  const uiRoutePrefix = options.uiRoutePrefix ?? "/docs";

  if (options.staticSpec) {
    const resolvedPath = path.isAbsolute(options.staticSpec.path)
      ? options.staticSpec.path
      : path.resolve(options.staticSpec.baseDir, options.staticSpec.path);
    await app.register(swagger, {
      mode: "static",
      specification: {
        path: resolvedPath,
        baseDir: options.staticSpec.baseDir,
      },
    });
  } else {
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
  }

  await app.register(swaggerUi, {
    routePrefix: uiRoutePrefix,
    uiConfig: {
      docExpansion: "list",
      deepLinking: true,
      persistAuthorization: true,
    },
  });
}
