import type { DbInstance } from "@hims/ts-sdk-db";
import type { FastifyInstance } from "fastify";
import type { PlatformModuleCatalogPort } from "../ports.js";
import { assertUmInternalServiceAccess } from "../http/assert-um-internal-service-access.js";
import { listEntitlementEnabledModuleIds } from "../use-cases/list-entitlement-enabled-module-ids.js";

export type InternalTenantEntitlementHandlerDeps = {
  db: DbInstance;
  /** Master Data global module catalog (HTTP adapter) — drops orphaned/deleted tenant modules. */
  platformModuleCatalog: PlatformModuleCatalogPort;
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
      const modules = await listEntitlementEnabledModuleIds(
        deps.db,
        deps.platformModuleCatalog,
        request.params.tenantId,
      );
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
