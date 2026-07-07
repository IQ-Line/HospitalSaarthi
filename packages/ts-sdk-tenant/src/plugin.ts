import type { FastifyInstance, FastifyPluginOptions } from "fastify";
import fp from "fastify-plugin";
import { tenantStorage } from "./context.js";

type HeaderValue = string | string[] | undefined;

function asSingleHeaderValue(value: HeaderValue): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

declare module "fastify" {
  interface FastifyRequest {
    tenantId: string;
    authViaApiKey?: boolean;
  }
}

function tenantPluginImpl(
  app: FastifyInstance,
  _opts: FastifyPluginOptions,
  done: (err?: Error) => void,
) {
  if (!app.hasRequestDecorator("tenantId")) {
    app.decorateRequest("tenantId", "");
  }

  // enterWith() transitions the current async context into the store,
  // so all downstream hooks and the route handler inherit it automatically.
  app.addHook("onRequest", async (request, reply) => {
    const path = request.url.split("?")[0] ?? "";
    if (path === "/healthz" || path.endsWith("/healthz")) {
      return;
    }

    // Platform discovery: organization/tenant registry reads (Configurator admin catalog).
    if (
      /\/configurator\/v1\/organizations\/?$/.test(path) ||
      /\/configurator\/v1\/organizations\/[^/]+\/?$/.test(path) ||
      /\/configurator\/v1\/tenants\/?$/.test(path) ||
      /\/configurator\/v1\/tenants\/[^/]+\/?$/.test(path)
    ) {
      return;
    }

    // ABDM bridge discovery — optional x-tenant-id (deployment credentials when omitted).
    if (
      path === "/api/abdm/v1/m0/bridge-services" ||
      path === "/api/abdm/v1/tenant/mapped-facility-ids"
    ) {
      const headerTenantId = asSingleHeaderValue(
        request.headers["x-tenant-id"] as string | string[] | undefined,
      );
      if (headerTenantId) {
        request.tenantId = headerTenantId;
        tenantStorage.enterWith({ tenantId: headerTenantId });
      }
      return;
    }

    if (request.authViaApiKey === true && request.tenantId) {
      tenantStorage.enterWith({ tenantId: request.tenantId });
      return;
    }

    const user = (request as unknown as Record<string, unknown>).user as
      | Record<string, unknown>
      | undefined;

    const headerTenantId =
      asSingleHeaderValue(request.headers["iq_tenant_id"] as HeaderValue) ??
      asSingleHeaderValue(request.headers["x-tenant-id"] as HeaderValue);

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
