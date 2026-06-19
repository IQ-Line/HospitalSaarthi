import type { FastifyInstance } from "fastify";
import type { CachedTenantEntitlementResolver } from "../services/cached-tenant-entitlement-resolver.js";
import type { TenantModuleEntitlementPort } from "../ports/module-integration-ports.js";

export type InternalEntitlementCacheHandlersDeps = {
  tenantEntitlementResolver: CachedTenantEntitlementResolver;
  tenantModuleEntitlementPort?: TenantModuleEntitlementPort & {
    invalidateTenantModuleCache?(tenantId?: string): void;
  };
  /** Shared secret for service-to-service invalidation (Configurator → UM). */
  internalApiKey?: string;
};

function isAuthorizedInternalRequest(
  request: { headers: Record<string, unknown> },
  internalApiKey: string | undefined,
): boolean {
  if (internalApiKey === undefined || internalApiKey.length === 0) {
    return false;
  }
  const header = request.headers["x-um-internal-key"];
  return typeof header === "string" && header === internalApiKey;
}

export function registerInternalEntitlementCacheHandlers(
  fastify: FastifyInstance,
  deps: InternalEntitlementCacheHandlersDeps,
): void {
  fastify.post<{ Params: { tenantId: string } }>(
    "/internal/tenant-entitlement-cache/invalidate/:tenantId",
    { config: { authMode: "public" } },
    async (request, reply) => {
      if (!isAuthorizedInternalRequest(request, deps.internalApiKey)) {
        return reply.status(401).send({
          error: "unauthorized",
          message: "Missing or invalid x-um-internal-key",
        });
      }

      const tenantId = request.params.tenantId.trim();
      if (tenantId.length === 0) {
        return reply.status(400).send({ error: "tenant_id_required" });
      }

      deps.tenantEntitlementResolver.invalidateTenantEntitlementCache(tenantId);
      deps.tenantModuleEntitlementPort?.invalidateTenantModuleCache?.(tenantId);

      return reply.send({ ok: true, tenant_id: tenantId });
    },
  );
}
