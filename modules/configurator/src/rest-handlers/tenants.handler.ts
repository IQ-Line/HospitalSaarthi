import type { FastifyInstance } from "fastify";
import type { TenantRepo } from "../ports.js";
import type { TenantFilters } from "../domain/tenant.types.js";
import { listTenants } from "../use-cases/list-tenants.js";

interface TenantsQuery {
  org_id?: string;
  status?: string;
  type?: string;
}

export function registerTenantsHandler(
  app: FastifyInstance,
  repo: TenantRepo,
): void {
  app.get<{ Querystring: TenantsQuery }>(
    "/tenants",
    async (request) => {
      const { org_id, status, type } = request.query;
      const filters: TenantFilters = {};

      if (org_id) filters.org_id = org_id;
      if (status) filters.provisioning_status = status as TenantFilters["provisioning_status"];
      if (type) filters.type = type as TenantFilters["type"];

      const result = await listTenants(repo, filters);
      return { data: result };
    },
  );
}
