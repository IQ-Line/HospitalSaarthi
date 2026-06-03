import type { FastifyInstance } from "fastify";
import { assertConfiguratorInternalAccess } from "../http/assert-configurator-internal-access.js";
import type { TenantIntegrationProfilesRepo, TenantRepo } from "../ports.js";
import type {
  CreateTenantIntegrationProfileData,
  UpdateTenantIntegrationProfileData,
  IntegrationKind,
} from "../domain/tenant-integration-profile.types.js";
import { listTenantIntegrationProfiles } from "../use-cases/list-tenant-integration-profiles.js";
import { createTenantIntegrationProfile } from "../use-cases/create-tenant-integration-profile.js";
import { getTenantIntegrationProfileById } from "../use-cases/get-tenant-integration-profile-by-id.js";
import { getActiveIntegrationProfileByHipId } from "../use-cases/get-active-integration-profile-by-hip-id.js";
import { updateTenantIntegrationProfile } from "../use-cases/update-tenant-integration-profile.js";
import { deleteTenantIntegrationProfile } from "../use-cases/delete-tenant-integration-profile.js";
import {
  patchTenantIntegrationProfileBodySchema,
  postTenantIntegrationProfileBodySchema,
  tenantIntegrationProfileParamsSchema,
  uuidParamSchema,
} from "./route-schemas.js";

interface IntegrationProfilesListQuery {
  integration_kind?: IntegrationKind;
  is_active?: boolean;
}

interface ByHipQuery {
  integration_kind?: IntegrationKind;
}

export interface TenantIntegrationProfilesHandlerDeps {
  tenantIntegrationProfilesRepo: TenantIntegrationProfilesRepo;
  tenantRepo: TenantRepo;
}

export function registerTenantIntegrationProfilesHandler(
  app: FastifyInstance,
  deps: TenantIntegrationProfilesHandlerDeps,
): void {
  const { tenantIntegrationProfilesRepo, tenantRepo } = deps;

  app.get<{ Params: { hipId: string }; Querystring: ByHipQuery }>(
    "/integration-profiles/by-hip/:hipId",
    {
      schema: {
        security: [{ internalServiceKey: [] }],
        params: {
          type: "object",
          required: ["hipId"],
          properties: { hipId: { type: "string", minLength: 1 } },
        },
        querystring: {
          type: "object",
          properties: {
            integration_kind: { type: "string", enum: ["abdm"] },
          },
        },
      },
    },
    async (request) => {
      assertConfiguratorInternalAccess(request);
      return getActiveIntegrationProfileByHipId(
        tenantIntegrationProfilesRepo,
        request.params.hipId,
        request.query.integration_kind ?? "abdm",
      );
    },
  );

  app.get<{ Params: { tenantId: string }; Querystring: IntegrationProfilesListQuery }>(
    "/tenants/:tenantId/integration-profiles",
    {
      schema: {
        params: {
          type: "object",
          required: ["tenantId"],
          properties: { tenantId: uuidParamSchema.properties.id },
        },
      },
    },
    async (request) => {
      const profiles = await listTenantIntegrationProfiles(
        tenantIntegrationProfilesRepo,
        {
          iq_tenant_id: request.params.tenantId,
          integration_kind: request.query.integration_kind,
          is_active: request.query.is_active,
        },
      );
      return { data: profiles, total: profiles.length };
    },
  );

  app.post<{
    Params: { tenantId: string };
    Body: Omit<CreateTenantIntegrationProfileData, "iq_tenant_id">;
  }>(
    "/tenants/:tenantId/integration-profiles",
    {
      schema: {
        params: {
          type: "object",
          required: ["tenantId"],
          properties: { tenantId: uuidParamSchema.properties.id },
        },
        body: postTenantIntegrationProfileBodySchema,
      },
    },
    async (request, reply) => {
      const created = await createTenantIntegrationProfile(
        tenantIntegrationProfilesRepo,
        tenantRepo,
        {
          iq_tenant_id: request.params.tenantId,
          ...request.body,
        },
      );
      return reply.code(201).send(created);
    },
  );

  app.get<{ Params: { tenantId: string; profileId: string } }>(
    "/tenants/:tenantId/integration-profiles/:profileId",
    {
      schema: { params: tenantIntegrationProfileParamsSchema },
    },
    async (request) => {
      return getTenantIntegrationProfileById(
        tenantIntegrationProfilesRepo,
        request.params.profileId,
        request.params.tenantId,
      );
    },
  );

  app.patch<{
    Params: { tenantId: string; profileId: string };
    Body: UpdateTenantIntegrationProfileData;
  }>(
    "/tenants/:tenantId/integration-profiles/:profileId",
    {
      schema: {
        params: tenantIntegrationProfileParamsSchema,
        body: patchTenantIntegrationProfileBodySchema,
      },
    },
    async (request) => {
      return updateTenantIntegrationProfile(
        tenantIntegrationProfilesRepo,
        request.params.profileId,
        request.params.tenantId,
        request.body,
      );
    },
  );

  app.delete<{ Params: { tenantId: string; profileId: string } }>(
    "/tenants/:tenantId/integration-profiles/:profileId",
    {
      schema: { params: tenantIntegrationProfileParamsSchema },
    },
    async (request, reply) => {
      await deleteTenantIntegrationProfile(
        tenantIntegrationProfilesRepo,
        request.params.profileId,
        request.params.tenantId,
      );
      return reply.code(204).send();
    },
  );
}
