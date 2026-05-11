import type { FastifyInstance } from "fastify";
import type { OrganizationRepo } from "../ports.js";
import type { OrganizationFilters } from "../domain/organization.types.js";
import { listOrganizations } from "../use-cases/list-organizations.js";

interface OrganizationsQuery {
  status?: string;
  type?: string;
}

export function registerOrganizationsHandler(
  app: FastifyInstance,
  repo: OrganizationRepo,
): void {
  app.get<{ Querystring: OrganizationsQuery }>(
    "/organizations",
    async (request) => {
      const { status, type } = request.query;
      const filters: OrganizationFilters = {};

      if (status) filters.status = status as OrganizationFilters["status"];
      if (type) filters.type = type as OrganizationFilters["type"];

      const orgs = await listOrganizations(repo, filters);
      return { data: orgs };
    },
  );
}
