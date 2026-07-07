import type { FastifyInstance } from "fastify";
import { getRequestActorId } from "../http/request-actor.js";
import type { SequenceConfigurationRepo, TenantRepo } from "../ports.js";
import type {
  SequenceConfigurationFilters,
  UpsertIdentifierInput,
} from "../domain/sequence-configuration.js";
import {
  getSequenceConfiguration,
  listSequenceConfigurations,
  upsertSequenceIdentifier,
} from "../use-cases/sequence-configuration.js";
import {
  sequenceConfigurationListQuerySchema,
  sequenceIdentifierUpsertBodySchema,
  tenantIdParamSchema,
  tenantIdentifierParamsSchema,
} from "./sequence-configuration.schemas.js";

interface SequenceConfigurationListQuery {
  org_id?: string;
  provisioning_status?: SequenceConfigurationFilters["provisioning_status"];
  status?: SequenceConfigurationFilters["status"];
  q?: string;
}

export interface SequenceConfigurationHandlerDeps {
  tenantRepo: TenantRepo;
  sequenceConfigurationRepo: SequenceConfigurationRepo;
}

export function registerSequenceConfigurationHandler(
  app: FastifyInstance,
  deps: SequenceConfigurationHandlerDeps,
): void {
  const { tenantRepo, sequenceConfigurationRepo } = deps;

  app.get<{ Querystring: SequenceConfigurationListQuery }>(
    "/sequence-configurations",
    {
      schema: { querystring: sequenceConfigurationListQuerySchema },
      config: { authMode: "protected" },
    },
    async (request) => {
      const { org_id, provisioning_status, status, q } = request.query;
      const filters: SequenceConfigurationFilters = {};
      if (org_id) filters.org_id = org_id;
      if (provisioning_status) filters.provisioning_status = provisioning_status;
      if (status) filters.status = status;
      if (q) filters.q = q;

      const data = await listSequenceConfigurations(sequenceConfigurationRepo, filters);
      return { data, total: data.length };
    },
  );

  app.get<{ Params: { tenantId: string } }>(
    "/tenants/:tenantId/sequence-configuration",
    {
      schema: { params: tenantIdParamSchema },
      config: { authMode: "protected" },
    },
    async (request) => {
      return getSequenceConfiguration(
        tenantRepo,
        sequenceConfigurationRepo,
        request.params.tenantId,
      );
    },
  );

  app.put<{
    Params: { tenantId: string; identifierType: string };
    Body: UpsertIdentifierInput;
  }>(
    "/tenants/:tenantId/sequence-configuration/identifiers/:identifierType",
    {
      schema: {
        params: tenantIdentifierParamsSchema,
        body: sequenceIdentifierUpsertBodySchema,
      },
      config: { authMode: "protected" },
    },
    async (request) => {
      const userId = getRequestActorId(request);
      return upsertSequenceIdentifier(
        tenantRepo,
        sequenceConfigurationRepo,
        request.params.tenantId,
        request.params.identifierType,
        request.body,
        userId,
      );
    },
  );
}
