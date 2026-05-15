import type { FastifyInstance } from "fastify";
import type { OrganizationRepo, RunConfiguratorTransaction } from "../ports.js";
import type {
  CreateOrganizationData,
  OrganizationFilters,
  UpdateOrganizationData,
} from "../domain/organization.types.js";
import { listOrganizations } from "../use-cases/list-organizations.js";
import {
  createOrganizationWithDefaultTenantAndTenantModules,
  type TenantModuleEnablementInput,
} from "../use-cases/create-organization-with-default-tenant-and-modules.js";
import { getOrganizationById } from "../use-cases/get-organization-by-id.js";
import { updateOrganization } from "../use-cases/update-organization.js";
import {
  patchOrganizationBodySchema,
  postOrganizationBodySchema,
  uuidParamSchema,
} from "./route-schemas.js";

type PostOrganizationRequestBody = CreateOrganizationData & {
  tenant_modules?: TenantModuleEnablementInput[];
};

interface OrganizationsQuery {
  status?: string;
  type?: string;
}

export interface OrganizationsHandlerDeps {
  organizationRepo: OrganizationRepo;
  runConfiguratorTransaction: RunConfiguratorTransaction;
}

export function registerOrganizationsHandler(
  app: FastifyInstance,
  deps: OrganizationsHandlerDeps,
): void {
  const { organizationRepo, runConfiguratorTransaction } = deps;

  app.get<{ Querystring: OrganizationsQuery }>(
    "/organizations",
    async (request) => {
      const { status, type } = request.query;
      const filters: OrganizationFilters = {};

      if (status) filters.status = status as OrganizationFilters["status"];
      if (type) filters.type = type as OrganizationFilters["type"];

      const orgs = await listOrganizations(organizationRepo, filters);
      return { data: orgs, total: orgs.length };
    },
  );

  app.post<{ Body: PostOrganizationRequestBody }>(
    "/organizations",
    {
      schema: {
        body: postOrganizationBodySchema,
      },
    },
    async (request, reply) => {
      const { tenant_modules = [], ...orgData } = request.body;
      const created = await runConfiguratorTransaction((repos) =>
        createOrganizationWithDefaultTenantAndTenantModules(
          repos.organizationRepo,
          repos.tenantRepo,
          repos.tenantModuleRepo,
          orgData,
          tenant_modules,
          orgData.created_by,
        ),
      );
      return reply.code(201).send(created);
    },
  );

  app.get<{ Params: { id: string } }>(
    "/organizations/:id",
    {
      schema: {
        params: uuidParamSchema,
      },
    },
    async (request, reply) => {
      const row = await getOrganizationById(organizationRepo, request.params.id);
      if (!row) {
        return reply.code(404).send({ error: "organization not found" });
      }
      return row;
    },
  );

  app.patch<{ Params: { id: string }; Body: UpdateOrganizationData }>(
    "/organizations/:id",
    {
      schema: {
        params: uuidParamSchema,
        body: patchOrganizationBodySchema,
      },
    },
    async (request, reply) => {
      const updated = await updateOrganization(
        organizationRepo,
        request.params.id,
        request.body,
      );
      if (!updated) {
        return reply.code(404).send({ error: "organization not found" });
      }
      return updated;
    },
  );
}
