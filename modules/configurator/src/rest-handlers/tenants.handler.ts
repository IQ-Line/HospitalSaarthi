import type { FastifyInstance } from "fastify";
import type { OrganizationRepo, TenantRepo } from "../ports.js";
import type {
  CreateTenantData,
  TenantFilters,
  UpdateTenantData,
} from "../domain/tenant.types.js";
import { listTenants } from "../use-cases/list-tenants.js";
import { createTenant } from "../use-cases/create-tenant.js";
import { getTenantById } from "../use-cases/get-tenant-by-id.js";
import { updateTenant } from "../use-cases/update-tenant.js";
import {
  patchTenantBodySchema,
  postTenantBodySchema,
  uuidParamSchema,
} from "./route-schemas.js";

interface TenantsQuery {
  org_id?: string;
  parent_tenant_id?: string;
  is_root?: string;
  /** Preferred — matches OpenAPI `provisioning_status`. */
  provisioning_status?: string;
  /** Legacy alias for `provisioning_status`. */
  status?: string;
  type?: string;
}

export interface TenantsHandlerDeps {
  tenantRepo: TenantRepo;
  organizationRepo: OrganizationRepo;
}

export function registerTenantsHandler(
  app: FastifyInstance,
  deps: TenantsHandlerDeps,
): void {
  const { tenantRepo, organizationRepo } = deps;

  app.get<{ Querystring: TenantsQuery }>(
    "/tenants",
    async (request) => {
      const {
        org_id,
        parent_tenant_id,
        is_root,
        provisioning_status,
        status,
        type,
      } = request.query;
      const filters: TenantFilters = {};

      if (org_id) filters.org_id = org_id;
      if (parent_tenant_id) {
        filters.parent_tenant_id = parent_tenant_id;
      }
      if (is_root === "true" || is_root === "1") {
        filters.is_root = true;
      }
      const prov = provisioning_status ?? status;
      if (prov) {
        filters.provisioning_status = prov as TenantFilters["provisioning_status"];
      }
      if (type) filters.type = type as TenantFilters["type"];

      const tenants = await listTenants(tenantRepo, filters);
      return { data: tenants, total: tenants.length };
    },
  );

  app.post<{ Body: CreateTenantData }>(
    "/tenants",
    {
      schema: {
        body: postTenantBodySchema,
      },
    },
    async (request, reply) => {
      const created = await createTenant(tenantRepo, organizationRepo, request.body);
      return reply.code(201).send(created);
    },
  );

  app.get<{ Params: { id: string } }>(
    "/tenants/:id",
    {
      schema: {
        params: uuidParamSchema,
      },
    },
    async (request, reply) => {
      const row = await getTenantById(tenantRepo, request.params.id);
      if (!row) {
        return reply.code(404).send({ error: "tenant not found" });
      }
      return row;
    },
  );

  app.patch<{ Params: { id: string }; Body: UpdateTenantData }>(
    "/tenants/:id",
    {
      schema: {
        params: uuidParamSchema,
        body: patchTenantBodySchema,
      },
    },
    async (request, reply) => {
      const updated = await updateTenant(
        tenantRepo,
        organizationRepo,
        request.params.id,
        request.body,
      );
      if (!updated) {
        return reply.code(404).send({ error: "tenant not found" });
      }
      return updated;
    },
  );
}
