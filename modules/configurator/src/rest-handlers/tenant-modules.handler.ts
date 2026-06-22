import type { FastifyInstance, FastifyRequest } from "fastify";
import {
  assertPlatformSuperAdmin,
  getRequestAuthContext,
} from "../http/request-auth-context.js";
import type { EventBus } from "@hims/ts-sdk-events";
import type { TenantModuleRepo, TenantRepo } from "../ports.js";
import type {
  CreateTenantModuleData,
  TenantModule,
  UpdateTenantModuleData,
} from "../domain/tenant-module.types.js";
import { listTenantModules } from "../use-cases/list-tenant-modules.js";
import { createTenantModule } from "../use-cases/create-tenant-module.js";
import { getTenantModuleByKey } from "../use-cases/get-tenant-module-by-key.js";
import { updateTenantModule } from "../use-cases/update-tenant-module.js";
import { deleteTenantModule } from "../use-cases/delete-tenant-module.js";
import {
  MODULE_DISABLED_EVENT,
  MODULE_ENABLED_EVENT,
  publishTenantModuleLifecycleEvent,
} from "../events/publish-tenant-module-lifecycle-event.js";
import {
  patchTenantModuleBodySchema,
  postTenantModuleBodySchema,
  tenantModuleParamsSchema,
} from "./route-schemas.js";

interface TenantModulesListQuery {
  is_active?: boolean;
}

export type TenantModuleEntitlementCacheInvalidator = {
  invalidateTenantEntitlementCache(tenantId: string): Promise<void>;
};

export interface TenantModulesHandlerDeps {
  tenantModuleRepo: TenantModuleRepo;
  tenantRepo: TenantRepo;
  eventBus?: EventBus;
  entitlementCacheInvalidator?: TenantModuleEntitlementCacheInvalidator;
}

async function notifyTenantModuleLifecycle(
  deps: TenantModulesHandlerDeps,
  request: FastifyRequest,
  row: TenantModule,
  previousIsActive: boolean | undefined,
): Promise<void> {
  const becameEnabled = row.is_active && previousIsActive !== true;
  const becameDisabled = !row.is_active && previousIsActive !== false;
  const eventType =
    becameEnabled ? MODULE_ENABLED_EVENT : becameDisabled ? MODULE_DISABLED_EVENT : undefined;

  if (eventType !== undefined && deps.eventBus !== undefined) {
    const correlationId =
      typeof (request as FastifyRequest & { correlationId?: string }).correlationId ===
      "string"
        ? (request as FastifyRequest & { correlationId?: string }).correlationId
        : undefined;
    const actorId = getRequestAuthContext(request).userId ?? undefined;
    publishTenantModuleLifecycleEvent(deps.eventBus, {
      eventType,
      iqTenantId: row.iq_tenant_id,
      moduleId: row.module_id,
      isActive: row.is_active,
      isCoreOverride: row.is_core_override,
      updatedAt: row.updated_at,
      correlationId,
      actorId,
    }).catch((err) => {
      request.log.warn({ err, eventType }, "tenant module lifecycle event publish failed");
    });
  }

  // Do not block PATCH/POST/DELETE on UM cache bust (avoids up to 5s wait when UM is slow/down).
  if ((becameEnabled || becameDisabled) && deps.entitlementCacheInvalidator !== undefined) {
    deps.entitlementCacheInvalidator
      .invalidateTenantEntitlementCache(row.iq_tenant_id)
      .catch((err) => {
        request.log.warn({ err }, "tenant entitlement cache invalidation failed");
      });
  }
}

export function registerTenantModulesHandler(
  app: FastifyInstance,
  deps: TenantModulesHandlerDeps,
): void {
  const { tenantModuleRepo, tenantRepo } = deps;

  app.get<{ Params: { tenantId: string }; Querystring: TenantModulesListQuery }>(
    "/tenants/:tenantId/modules",
    {
      schema: {
        params: {
          type: "object",
          required: ["tenantId"],
          properties: {
            tenantId: tenantModuleParamsSchema.properties.tenantId,
          },
        },
      },
    },
    async (request) => {
      const modules = await listTenantModules(tenantModuleRepo, {
        iq_tenant_id: request.params.tenantId,
        is_active: request.query.is_active,
      });
      return { data: modules, total: modules.length };
    },
  );

  app.post<{ Params: { tenantId: string }; Body: Omit<CreateTenantModuleData, "iq_tenant_id"> }>(
    "/tenants/:tenantId/modules",
    {
      schema: {
        params: {
          type: "object",
          required: ["tenantId"],
          properties: {
            tenantId: tenantModuleParamsSchema.properties.tenantId,
          },
        },
        body: postTenantModuleBodySchema,
      },
    },
    async (request, reply) => {
      // Role-consistent with PATCH/DELETE: enabling a module is a platform-admin op.
      // Auth inside the handler body (not a sync preHandler): a sync preHandler + body
      // schema can stall Fastify 5 (see PATCH below).
      assertPlatformSuperAdmin(request);
      const created = await createTenantModule(tenantModuleRepo, tenantRepo, {
        iq_tenant_id: request.params.tenantId,
        ...request.body,
      });
      void notifyTenantModuleLifecycle(deps, request, created, undefined);
      return reply.code(201).send(created);
    },
  );

  app.get<{ Params: { tenantId: string; moduleId: string } }>(
    "/tenants/:tenantId/modules/:moduleId",
    {
      schema: {
        params: tenantModuleParamsSchema,
      },
    },
    async (request, reply) => {
      const row = await getTenantModuleByKey(tenantModuleRepo, {
        iq_tenant_id: request.params.tenantId,
        module_id: request.params.moduleId,
      });
      if (!row) {
        return reply.code(404).send({ error: "tenant module not found" });
      }
      return row;
    },
  );

  app.patch<{
    Params: { tenantId: string; moduleId: string };
    Body: UpdateTenantModuleData;
  }>(
    "/tenants/:tenantId/modules/:moduleId",
    {
      schema: {
        params: tenantModuleParamsSchema,
        body: patchTenantModuleBodySchema,
      },
    },
    async (request, reply) => {
      // Auth after schema validation: sync preHandler + PATCH body schema can stall Fastify 5.
      assertPlatformSuperAdmin(request);
      const key = {
        iq_tenant_id: request.params.tenantId,
        module_id: request.params.moduleId,
      };
      const result = await updateTenantModule(tenantModuleRepo, key, request.body);
      if (!result) {
        return reply.code(404).send({ error: "tenant module not found" });
      }
      void notifyTenantModuleLifecycle(
        deps,
        request,
        result.updated,
        result.previousIsActive,
      );
      return result.updated;
    },
  );

  app.delete<{ Params: { tenantId: string; moduleId: string } }>(
    "/tenants/:tenantId/modules/:moduleId",
    {
      schema: {
        params: tenantModuleParamsSchema,
      },
    },
    async (request, reply) => {
      assertPlatformSuperAdmin(request);
      const key = {
        iq_tenant_id: request.params.tenantId,
        module_id: request.params.moduleId,
      };
      const existing = await getTenantModuleByKey(tenantModuleRepo, key);
      const deleted = await deleteTenantModule(tenantModuleRepo, key);
      if (!deleted) {
        return reply.code(404).send({ error: "tenant module not found" });
      }
      if (existing !== undefined) {
        void notifyTenantModuleLifecycle(
          deps,
          request,
          { ...existing, is_active: false },
          existing.is_active,
        );
      }
      return reply.code(204).send();
    },
  );
}
