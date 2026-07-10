import type { FastifyInstance } from "fastify";
import type { OrganizationRepo, RunConfiguratorTransaction } from "../ports.js";
import type {
  CreateOrganizationData,
  OrganizationFilters,
  UpdateOrganizationData,
} from "../domain/organization.types.js";
import { createOrganization } from "../use-cases/create-organization.js";
import { listOrganizations } from "../use-cases/list-organizations.js";
import { getOrganizationById } from "../use-cases/get-organization-by-id.js";
import { updateOrganization } from "../use-cases/update-organization.js";
import {
  patchOrganizationBodySchema,
  postOrganizationBodySchema,
  uuidParamSchema,
} from "./route-schemas.js";

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
    { config: { authMode: "protected" } },
    async (request) => {
      const { status, type } = request.query;
      const filters: OrganizationFilters = {};

      if (status) filters.status = status as OrganizationFilters["status"];
      if (type) filters.type = type as OrganizationFilters["type"];

      const orgs = await listOrganizations(organizationRepo, filters);
      return { data: orgs, total: orgs.length };
    },
  );

  app.post<{ Body: CreateOrganizationData }>(
    "/organizations",
    {
      schema: { body: postOrganizationBodySchema },
      config: { authMode: "protected" },
    },
    async (request, reply) => {
      const created = await runConfiguratorTransaction((repos) =>
        createOrganization(repos.organizationRepo, request.body),
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
      config: { authMode: "protected" },
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
      config: { authMode: "protected" },
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
