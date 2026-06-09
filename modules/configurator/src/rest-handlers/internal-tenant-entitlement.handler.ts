import type { FastifyInstance } from "fastify";
import { assertUmInternalServiceAccess } from "../http/assert-um-internal-service-access.js";
import type { TenantModuleRepo } from "../ports.js";
import { listTenantModules } from "../use-cases/list-tenant-modules.js";

export type InternalTenantEntitlementHandlerDeps = {
  tenantModuleRepo: TenantModuleRepo;
};

/**
 * Internal S2S route for User Management principal entitlement hydration.
 * Skips JWT identity (see configurator-svc `skipPathPrefixes`) — protected by `x-um-internal-key`.
 */
export function registerInternalTenantEntitlementHandler(
  app: FastifyInstance,
  deps: InternalTenantEntitlementHandlerDeps,
): void {
  app.get<{ Params: { tenantId: string } }>(
    "/internal/tenants/:tenantId/enabled-module-ids",
    async (request) => {
      assertUmInternalServiceAccess(request);
      const modules = await listTenantModules(deps.tenantModuleRepo, {
        iq_tenant_id: request.params.tenantId,
        is_active: true,
      });
      return {
        data: modules.map((row) => ({
          module_id: row.module_id,
          is_active: row.is_active,
        })),
        total: modules.length,
      };
    },
  );
}
