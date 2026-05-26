import type { FastifyInstance } from "fastify";
import { assertPlatformSuperAdmin } from "../http/request-auth-context.js";
import type { TenantModuleRepo, TenantRepo } from "../ports.js";
import type {
  CreateTenantModuleData,
  UpdateTenantModuleData,
} from "../domain/tenant-module.types.js";
import { listTenantModules } from "../use-cases/list-tenant-modules.js";
import { createTenantModule } from "../use-cases/create-tenant-module.js";
import { getTenantModuleByKey } from "../use-cases/get-tenant-module-by-key.js";
import { updateTenantModule } from "../use-cases/update-tenant-module.js";
import { deleteTenantModule } from "../use-cases/delete-tenant-module.js";
import {
  patchTenantModuleBodySchema,
  postTenantModuleBodySchema,
  tenantModuleParamsSchema,
} from "./route-schemas.js";

interface TenantModulesListQuery {
  is_active?: boolean;
}

export interface TenantModulesHandlerDeps {
  tenantModuleRepo: TenantModuleRepo;
  tenantRepo: TenantRepo;
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
      const created = await createTenantModule(tenantModuleRepo, tenantRepo, {
        iq_tenant_id: request.params.tenantId,
        ...request.body,
      });
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
      preHandler: (request) => { assertPlatformSuperAdmin(request); },
    },
    async (request, reply) => {
      const updated = await updateTenantModule(
        tenantModuleRepo,
        {
          iq_tenant_id: request.params.tenantId,
          module_id: request.params.moduleId,
        },
        request.body,
      );
      if (!updated) {
        return reply.code(404).send({ error: "tenant module not found" });
      }
      return updated;
    },
  );

  app.delete<{ Params: { tenantId: string; moduleId: string } }>(
    "/tenants/:tenantId/modules/:moduleId",
    {
      schema: {
        params: tenantModuleParamsSchema,
      },
      preHandler: (request) => { assertPlatformSuperAdmin(request); },
    },
    async (request, reply) => {
      const deleted = await deleteTenantModule(tenantModuleRepo, {
        iq_tenant_id: request.params.tenantId,
        module_id: request.params.moduleId,
      });
      if (!deleted) {
        return reply.code(404).send({ error: "tenant module not found" });
      }
      return reply.code(204).send();
    },
  );
}
