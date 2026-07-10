import type { FastifyInstance } from "fastify";
import { getRequestActorId } from "../http/request-actor.js";
import type { TenantApiKeyRepo, TenantRepo } from "../ports.js";
import type { TenantApiKeyStatus } from "../domain/tenant-api-key.types.js";
import { listTenantApiKeys } from "../use-cases/list-tenant-api-keys.js";
import { createTenantApiKey } from "../use-cases/create-tenant-api-key.js";
import { updateTenantApiKeyStatus } from "../use-cases/update-tenant-api-key-status.js";
import { uuidParamSchema } from "./route-schemas.js";

interface ApiKeysListQuery {
  status?: TenantApiKeyStatus;
}

interface CreateApiKeyBody {
  label?: string | null;
  environment: "live" | "test";
  expires_at?: string | null;
}

interface PatchApiKeyBody {
  status: TenantApiKeyStatus;
}

export interface TenantApiKeysHandlerDeps {
  tenantApiKeyRepo: TenantApiKeyRepo;
  tenantRepo: TenantRepo;
}

export function registerTenantApiKeysHandler(
  app: FastifyInstance,
  deps: TenantApiKeysHandlerDeps,
): void {
  const { tenantApiKeyRepo, tenantRepo } = deps;

  app.get<{ Params: { tenantId: string }; Querystring: ApiKeysListQuery }>(
    "/tenants/:tenantId/api-keys",
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
            status: { type: "string", enum: ["active", "disabled", "revoked"] },
          },
        },
      },
      config: { authMode: "protected" },
    },
    async (request) => {
      const keys = await listTenantApiKeys(tenantApiKeyRepo, {
        iq_tenant_id: request.params.tenantId,
        status: request.query.status,
        purpose: "opd_slip",
      });
      return { data: keys, total: keys.length };
    },
  );

  app.post<{ Params: { tenantId: string }; Body: CreateApiKeyBody }>(
    "/tenants/:tenantId/api-keys",
    {
      schema: {
        params: {
          type: "object",
          required: ["tenantId"],
          properties: { tenantId: uuidParamSchema.properties.id },
        },
        body: {
          type: "object",
          required: ["environment"],
          properties: {
            label: { anyOf: [{ type: "string", maxLength: 120 }, { type: "null" }] },
            environment: { type: "string", enum: ["live", "test"] },
            expires_at: { anyOf: [{ type: "string", format: "date-time" }, { type: "null" }] },
          },
        },
      },
      config: { authMode: "protected" },
    },
    async (request, reply) => {
      const userId = getRequestActorId(request);
      const created = await createTenantApiKey(
        tenantApiKeyRepo,
        tenantRepo,
        request.params.tenantId,
        request.body,
        userId,
      );
      return reply.code(201).send(created);
    },
  );

  app.patch<{
    Params: { tenantId: string; apiKeyId: string };
    Body: PatchApiKeyBody;
  }>(
    "/tenants/:tenantId/api-keys/:apiKeyId",
    {
      schema: {
        params: {
          type: "object",
          required: ["tenantId", "apiKeyId"],
          properties: {
            tenantId: uuidParamSchema.properties.id,
            apiKeyId: uuidParamSchema.properties.id,
          },
        },
        body: {
          type: "object",
          required: ["status"],
          properties: {
            status: { type: "string", enum: ["active", "disabled", "revoked"] },
          },
        },
      },
      config: { authMode: "protected" },
    },
    async (request) => {
      const userId = getRequestActorId(request);
      return updateTenantApiKeyStatus(
        tenantApiKeyRepo,
        request.params.tenantId,
        request.params.apiKeyId,
        request.body.status,
        userId,
      );
    },
  );
}
