import type { FastifyInstance } from "fastify";
import { ConfiguratorError } from "../errors.js";
import { assertConfiguratorInternalAccess } from "../http/assert-configurator-internal-access.js";
import { assertPlatformSuperAdmin } from "../http/request-auth-context.js";
import type { TenantIntegrationProfilesRepo, TenantRepo } from "../ports.js";
import type {
  CreateTenantIntegrationProfileData,
  UpdateTenantIntegrationProfileData,
  IntegrationKind,
  TenantIntegrationProfile,
} from "../domain/tenant-integration-profile.types.js";
import { listTenantIntegrationProfiles } from "../use-cases/list-tenant-integration-profiles.js";
import { createTenantIntegrationProfile } from "../use-cases/create-tenant-integration-profile.js";
import { getTenantIntegrationProfileById } from "../use-cases/get-tenant-integration-profile-by-id.js";
import { getActiveIntegrationProfileByHipId } from "../use-cases/get-active-integration-profile-by-hip-id.js";
import { listActiveAbdmIntegrationProfiles } from "../use-cases/list-active-abdm-integration-profiles.js";
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

/**
 * Strip the stored ABDM `client_secret` from management (super-admin) responses.
 * The credential is write-only over the management surface: defense-in-depth, the
 * plaintext secret must never travel back over the wire (logs, browser cache) even
 * to a super-admin. The internal S2S routes (by-hip / by-tenant) deliberately keep
 * it — integration-hub needs it to authenticate to the ABDM gateway.
 */
function redactProfileSecret(
  profile: TenantIntegrationProfile,
): TenantIntegrationProfile {
  return { ...profile, client_secret: null };
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

  app.get<{ Params: { tenantId: string }; Querystring: ByHipQuery }>(
    "/integration-profiles/by-tenant/:tenantId",
    {
      schema: {
        params: {
          type: "object",
          required: ["tenantId"],
          properties: { tenantId: uuidParamSchema.properties.id },
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
      const row = await tenantIntegrationProfilesRepo.findActiveByTenantId(
        request.params.tenantId,
        request.query.integration_kind ?? "abdm",
      );
      if (!row) {
        throw new ConfiguratorError(404, "no active integration profile for tenant");
      }
      return row;
    },
  );

  app.get("/integration-profiles/active-abdm", async (request) => {
    assertConfiguratorInternalAccess(request);
    return listActiveAbdmIntegrationProfiles(tenantIntegrationProfilesRepo);
  });

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
      assertPlatformSuperAdmin(request);
      const profiles = await listTenantIntegrationProfiles(
        tenantIntegrationProfilesRepo,
        {
          iq_tenant_id: request.params.tenantId,
          integration_kind: request.query.integration_kind,
          is_active: request.query.is_active,
        },
      );
      return { data: profiles.map(redactProfileSecret), total: profiles.length };
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
      assertPlatformSuperAdmin(request);
      const created = await createTenantIntegrationProfile(
        tenantIntegrationProfilesRepo,
        tenantRepo,
        {
          iq_tenant_id: request.params.tenantId,
          ...request.body,
        },
      );
      return reply.code(201).send(redactProfileSecret(created));
    },
  );

  app.get<{ Params: { tenantId: string; profileId: string } }>(
    "/tenants/:tenantId/integration-profiles/:profileId",
    {
      schema: { params: tenantIntegrationProfileParamsSchema },
    },
    async (request) => {
      assertPlatformSuperAdmin(request);
      return redactProfileSecret(
        await getTenantIntegrationProfileById(
          tenantIntegrationProfilesRepo,
          request.params.profileId,
          request.params.tenantId,
        ),
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
      assertPlatformSuperAdmin(request);
      return redactProfileSecret(
        await updateTenantIntegrationProfile(
          tenantIntegrationProfilesRepo,
          request.params.profileId,
          request.params.tenantId,
          request.body,
        ),
      );
    },
  );

  app.delete<{ Params: { tenantId: string; profileId: string } }>(
    "/tenants/:tenantId/integration-profiles/:profileId",
    {
      schema: { params: tenantIntegrationProfileParamsSchema },
    },
    async (request, reply) => {
      assertPlatformSuperAdmin(request);
      await deleteTenantIntegrationProfile(
        tenantIntegrationProfilesRepo,
        request.params.profileId,
        request.params.tenantId,
      );
      return reply.code(204).send();
    },
  );
}
