import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import { tenantStorage } from "./context.js";

export type TenantSourceMode = "header-or-jwt" | "jwt";

export interface TenantPluginOptions {
  /**
   * `jwt` — tenant from verified JWT principal only; conflicting headers → 403.
   * `header-or-jwt` — legacy dev behavior (header preferred).
   */
  tenantSource?: TenantSourceMode;
}

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

function resolveJwtTenantId(user: Record<string, unknown> | undefined): string | undefined {
  if (user == null) return undefined;
  const fromPrincipal =
    typeof user.tenantId === "string" && user.tenantId.trim().length > 0
      ? user.tenantId.trim()
      : undefined;
  if (fromPrincipal) return fromPrincipal;
  const fromClaim =
    typeof user.iq_tenant_id === "string" && user.iq_tenant_id.trim().length > 0
      ? user.iq_tenant_id.trim()
      : undefined;
  return fromClaim;
}

function tenantMismatch(reply: FastifyReply): void {
  reply.code(403).send({
    statusCode: 403,
    error: "Forbidden",
    code: "AUTH_TENANT_MISMATCH",
    message: "Tenant header does not match JWT tenant",
  });
}

function tenantPluginImpl(
  app: FastifyInstance,
  opts: TenantPluginOptions,
  done: (err?: Error) => void,
) {
  const tenantSource: TenantSourceMode = opts.tenantSource ?? "header-or-jwt";

  app.decorateRequest("tenantId", "");

  app.addHook("onRequest", async (request: FastifyRequest, reply: FastifyReply) => {
    const path = request.url.split("?")[0] ?? "";
    if (path === "/healthz" || path.endsWith("/healthz")) {
      return;
    }

    if (
      /\/configurator\/v1\/organizations\/?$/.test(path) ||
      /\/configurator\/v1\/organizations\/[^/]+\/?$/.test(path) ||
      /\/configurator\/v1\/tenants\/?$/.test(path) ||
      /\/configurator\/v1\/tenants\/[^/]+\/?$/.test(path)
    ) {
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

    const jwtTenantId = resolveJwtTenantId(user);

    if (tenantSource === "jwt") {
      if (!jwtTenantId) {
        return reply.code(400).send({
          statusCode: 400,
          error: "Bad Request",
          message: "Missing tenant id in JWT principal",
        });
      }
      if (headerTenantId && headerTenantId !== jwtTenantId) {
        tenantMismatch(reply);
        return;
      }
      request.tenantId = jwtTenantId;
      tenantStorage.enterWith({ tenantId: jwtTenantId });
      return;
    }

    const tenantId = headerTenantId ?? jwtTenantId;

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
