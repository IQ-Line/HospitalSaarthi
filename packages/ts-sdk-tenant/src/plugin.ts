import type { FastifyInstance, FastifyPluginOptions } from "fastify";
import fp from "fastify-plugin";
import { tenantStorage } from "./context.js";

function asSingleHeaderValue(
  value: string | string[] | undefined,
): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

declare module "fastify" {
  interface FastifyRequest {
    tenantId: string;
  }
}

function tenantPluginImpl(
  app: FastifyInstance,
  _opts: FastifyPluginOptions,
  done: (err?: Error) => void,
) {
  app.decorateRequest("tenantId", "");

  // enterWith() transitions the current async context into the store,
  // so all downstream hooks and the route handler inherit it automatically.
  app.addHook("onRequest", async (request, reply) => {
    const path = request.url.split("?")[0] ?? "";
    if (path === "/healthz" || path.endsWith("/healthz")) {
      return;
    }

    const user = (request as unknown as Record<string, unknown>).user as
      | Record<string, unknown>
      | undefined;

    const headerTenantId =
      asSingleHeaderValue(
        request.headers["iq_tenant_id"] as string | string[] | undefined,
      ) ??
      asSingleHeaderValue(
        request.headers["x-tenant-id"] as string | string[] | undefined,
      );

    const tenantId =
      headerTenantId ?? ((user?.iq_tenant_id as string) || undefined);

    if (!tenantId) {
      return reply.code(400).send({
        statusCode: 400,
        error: "Bad Request",
        message: "Missing tenant id (iq_tenant_id header or x-tenant-id header)",
      });
    }

    request.tenantId = tenantId;
    tenantStorage.enterWith({ tenantId });
  });

  done();
}

export const tenantPlugin = fp(tenantPluginImpl, {
  name: "@hims/ts-sdk-tenant",
  fastify: ">=5.0.0",
});
