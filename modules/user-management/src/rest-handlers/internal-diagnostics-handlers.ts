import type { FastifyInstance, FastifyRequest } from "fastify";
import { replyWithUserManagementError } from "../http/map-user-management-error.js";
import type { Capability } from "../ports/index.js";
import type { RuntimeCapabilityCatalogPort } from "../ports/capability-catalog-ports.js";
import type { TenantModuleEntitlementPort } from "../ports/module-integration-ports.js";
import { PLATFORM_RUNTIME_MODULE_SLUGS } from "../domain/platform-module-slugs.js";
import { normalizeModuleSlug } from "../domain/module-slug.js";

export type InternalDiagnosticsHandlersDeps = {
  getTenantId: (request: FastifyRequest) => string;
  tenantModuleEntitlementPort: TenantModuleEntitlementPort;
  masterDataModuleCatalogPort: {
    resolveModuleSlugsByIds(moduleIds: string[]): Promise<Map<string, string>>;
  };
  runtimeCapabilityCatalogPort: RuntimeCapabilityCatalogPort;
};

type DiagnosticsCapability = {
  id: string;
  capability_key: string;
  module: string;
  feature: string;
  action: string;
  display_name: string;
  is_active: boolean;
  source_module_slug: string | null;
  source_permission_slug: string | null;
  source_catalog: Capability["source_catalog"];
};

function toDiagnosticsCapability(capability: Capability): DiagnosticsCapability {
  return {
    id: capability.id,
    capability_key: capability.capability_key,
    module: normalizeModuleSlug(capability.module),
    feature: capability.feature,
    action: capability.action,
    display_name: capability.display_name,
    is_active: capability.is_active,
    source_module_slug: capability.source_module_slug ?? null,
    source_permission_slug: capability.source_permission_slug ?? null,
    source_catalog: capability.source_catalog ?? null,
  };
}

export function registerInternalDiagnosticsHandlers(
  fastify: FastifyInstance,
  deps: InternalDiagnosticsHandlersDeps,
): void {
  fastify.get<{ Params: { tenantId: string } }>(
    "/internal/module-entitlements/:tenantId",
    { config: { authMode: "protected", authz: { kind: "capability", id: "internal-entitlements", action: "capability.read" } } },
    async (request, reply) => {
      const cid = request.correlationId ?? request.id;
      try {
        const routeTenantId = request.params.tenantId;
        const tokenTenantId = deps.getTenantId(request);
        if (routeTenantId !== tokenTenantId) {
          return reply.status(403).send({
            diagnostic: "internal",
            error: "tenant_scope_mismatch",
            message: "Diagnostics are limited to the authenticated tenant",
          });
        }

        const authorization =
          typeof request.headers.authorization === "string"
            ? request.headers.authorization
            : undefined;

        const tenantEnabledModuleIds =
          await deps.tenantModuleEntitlementPort.listTenantEnabledModuleIds(routeTenantId, {
            authorization,
            cachePolicy: "bypass-cache",
          });
        const moduleSlugById = await deps.masterDataModuleCatalogPort.resolveModuleSlugsByIds(
          tenantEnabledModuleIds,
        );

        const entitlements = tenantEnabledModuleIds.map((moduleId) => ({
          module_id: moduleId,
          module_slug: moduleSlugById.get(moduleId) ?? null,
          resolved: moduleSlugById.has(moduleId),
        }));

        return reply.send({
          diagnostic: "internal",
          tenant_id: routeTenantId,
          platform_runtime_module_slugs: [...PLATFORM_RUNTIME_MODULE_SLUGS],
          tenant_enabled_modules: entitlements,
        });
      } catch (err) {
        return replyWithUserManagementError(reply, err, cid);
      }
    },
  );

  fastify.get(
    "/internal/runtime-capability-catalog",
    { config: { authMode: "protected", authz: { kind: "capability", id: "internal-catalog", action: "capability.read" } } },
    async (request, reply) => {
      const cid = request.correlationId ?? request.id;
      try {
        const catalog = await deps.runtimeCapabilityCatalogPort.listRuntimeCatalog();
        return reply.send({
          diagnostic: "internal",
          catalog: catalog.map(toDiagnosticsCapability),
        });
      } catch (err) {
        return replyWithUserManagementError(reply, err, cid);
      }
    },
  );

  fastify.get(
    "/internal/runtime-capability-catalog/assignable",
    { config: { authMode: "protected", authz: { kind: "capability", id: "internal-assignable", action: "capability.read" } } },
    async (request, reply) => {
      const tenantId = deps.getTenantId(request);
      const cid = request.correlationId ?? request.id;
      const authorization =
        typeof request.headers.authorization === "string"
          ? request.headers.authorization
          : undefined;
      try {
        const catalog = await deps.runtimeCapabilityCatalogPort.listAssignableForTenant(tenantId, {
          authorization,
          cachePolicy: "bypass-cache",
        });
        return reply.send({
          diagnostic: "internal",
          tenant_id: tenantId,
          platform_runtime_module_slugs: [...PLATFORM_RUNTIME_MODULE_SLUGS],
          catalog: catalog.map(toDiagnosticsCapability),
        });
      } catch (err) {
        return replyWithUserManagementError(reply, err, cid);
      }
    },
  );
}
