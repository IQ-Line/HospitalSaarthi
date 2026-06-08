import { forbidden } from "@hims/ts-sdk-http";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import { tenantStorage } from "./context.js";
import type { TenantPluginOptions, TenantSource } from "./types.js";

function asSingleHeaderValue(
  value: string | string[] | undefined,
): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function isTenantBypassPath(path: string): boolean {
  if (path === "/healthz" || path.endsWith("/healthz")) {
    return true;
  }

  return (
    /\/configurator\/v1\/organizations\/?$/.test(path) ||
    /\/configurator\/v1\/organizations\/[^/]+\/?$/.test(path) ||
    /\/configurator\/v1\/tenants\/?$/.test(path) ||
    /\/configurator\/v1\/tenants\/[^/]+\/?$/.test(path)
  );
}

function readHeaderTenantId(request: FastifyRequest): string | undefined {
  return (
    asSingleHeaderValue(
      request.headers["iq_tenant_id"] as string | string[] | undefined,
    ) ??
    asSingleHeaderValue(
      request.headers["x-tenant-id"] as string | string[] | undefined,
    )
  );
}

function readJwtTenantId(request: FastifyRequest): string | undefined {
  const user = (request as FastifyRequest & { user?: { tenantId?: string } }).user;
  const tenantId = user?.tenantId;
  return typeof tenantId === "string" && tenantId.trim().length > 0
    ? tenantId.trim()
    : undefined;
}

function resolveTenantId(
  request: FastifyRequest,
  reply: FastifyReply,
  tenantSource: TenantSource,
): string | undefined {
  const headerTenantId = readHeaderTenantId(request);
  const jwtTenantId = readJwtTenantId(request);

  if (tenantSource === "jwt") {
    if (jwtTenantId === undefined) {
      reply.code(400).send({
        statusCode: 400,
        error: "Bad Request",
        message: "Missing tenant id from verified JWT (iq_tenant_id claim)",
      });
      return undefined;
    }
    if (headerTenantId !== undefined && headerTenantId !== jwtTenantId) {
      forbidden(reply, request, "AUTH_TENANT_MISMATCH", "Tenant header does not match JWT tenant");
      return undefined;
    }
    return jwtTenantId;
  }

  const tenantId = headerTenantId ?? jwtTenantId;
  if (tenantId === undefined) {
    reply.code(400).send({
      statusCode: 400,
      error: "Bad Request",
      message: "Missing tenant id (iq_tenant_id header, x-tenant-id header, or JWT claim)",
    });
    return undefined;
  }
  return tenantId;
}

declare module "fastify" {
  interface FastifyRequest {
    tenantId: string;
  }
}

function tenantPluginImpl(
  app: FastifyInstance,
  opts: TenantPluginOptions,
  done: (err?: Error) => void,
) {
  const tenantSource: TenantSource = opts.tenantSource ?? "header-or-jwt";

  app.decorateRequest("tenantId", "");

  app.addHook("onRequest", async (request, reply) => {
    const path = request.url.split("?")[0] ?? "";
    if (isTenantBypassPath(path)) {
      return;
    }

    const tenantId = resolveTenantId(request, reply, tenantSource);
    if (tenantId === undefined) {
      return;
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
