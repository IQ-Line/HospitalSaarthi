import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { DbInstance } from "@hims/ts-sdk-db";
import { verifyApiKeySecret } from "../control-plane/lib/api-key-crypto.js";
import { DrizzleIntegrationApiKeyRepository } from "../control-plane/data-access/integration-api-key-repository.js";
import { DrizzleIntegrationRepository } from "../control-plane/data-access/integration-repository.js";
import type { Integration } from "../control-plane/domain/integration.types.js";
import { mintPartnerJwt, type PartnerJwtSignerConfig } from "./partner-jwt.js";

export { loadPartnerJwtSignerFromEnv } from "./partner-jwt.js";

const KEY_PREFIX_LEN = 16;

type PartnerOperationTarget = {
  method: "GET";
  buildPath: (params: Record<string, string>) => string;
  upstreamEnvVar: "registration" | "empi";
};

const PARTNER_OPERATIONS: Record<string, PartnerOperationTarget> = {
  "registration.listRegistrations": {
    method: "GET",
    buildPath: () => "/api/registration/v1/registrations",
    upstreamEnvVar: "registration",
  },
  "empi.getPatient": {
    method: "GET",
    buildPath: (params) => `/api/empi/v1/patients/${encodeURIComponent(params.patientId ?? "")}`,
    upstreamEnvVar: "empi",
  },
};

export type { PartnerJwtSignerConfig } from "./partner-jwt.js";

export type InboundRouterOptions = {
  db: DbInstance;
  registrationBaseUrl: string;
  empiBaseUrl: string;
  partnerJwt: PartnerJwtSignerConfig;
};

type InboundContext = {
  tenantId: string;
  integration: Integration;
  partnerPrincipalId: string;
  apiKeyId: string;
};

function joinUrl(base: string, path: string): string {
  return `${base.replace(/\/$/, "")}${path}`;
}

function parseBearerApiKey(request: FastifyRequest): string | null {
  const header = request.headers.authorization;
  if (typeof header !== "string" || !header.startsWith("Bearer ")) {
    return null;
  }
  const token = header.slice("Bearer ".length).trim();
  return token.length > 0 ? token : null;
}

function sendInboundError(
  reply: FastifyReply,
  status: number,
  code: string,
  message?: string,
): void {
  void reply.code(status).send({ code, message });
}

export function createInboundRouter(options: InboundRouterOptions) {
  const apiKeys = new DrizzleIntegrationApiKeyRepository(options.db);
  const integrations = new DrizzleIntegrationRepository(options.db);

  async function authenticate(request: FastifyRequest, reply: FastifyReply): Promise<InboundContext | null> {
    const apiKey = parseBearerApiKey(request);
    if (apiKey === null || apiKey.length < KEY_PREFIX_LEN) {
      sendInboundError(reply, 401, "INBOUND_API_KEY_INVALID");
      return null;
    }

    const prefix = apiKey.slice(0, KEY_PREFIX_LEN);
    const record = await apiKeys.findActiveByPrefix(prefix);
    if (record === null || !verifyApiKeySecret(apiKey, record.key_hash)) {
      sendInboundError(reply, 401, "INBOUND_API_KEY_INVALID");
      return null;
    }

    const integration = await integrations.findById(record.iq_tenant_id, record.integration_id);
    if (
      integration === null ||
      integration.status !== "active" ||
      integration.partner_principal_id === null
    ) {
      sendInboundError(reply, 401, "INBOUND_INTEGRATION_INACTIVE");
      return null;
    }

    void apiKeys.touchLastUsedAt(record.iq_tenant_id, record.api_key_id);

    return {
      tenantId: record.iq_tenant_id,
      integration,
      partnerPrincipalId: integration.partner_principal_id,
      apiKeyId: record.api_key_id,
    };
  }

  function upstreamBase(target: PartnerOperationTarget): string {
    return target.upstreamEnvVar === "registration"
      ? options.registrationBaseUrl
      : options.empiBaseUrl;
  }

  return async function inboundDataPlaneRouter(fastify: FastifyInstance) {
    fastify.get("/.well-known/jwks.json", async (_request, reply) => {
      return reply.send({ keys: [options.partnerJwt.publicJwk] });
    });

    fastify.get("/inbound/registration.listRegistrations", async (request, reply) => {
      const ctx = await authenticate(request, reply);
      if (ctx === null) return;

      const operation = "registration.listRegistrations";
      if (!ctx.integration.config.allowedOperations.includes(operation)) {
        return sendInboundError(reply, 403, "INBOUND_OPERATION_NOT_ALLOWED");
      }

      const jwt = await mintPartnerJwt(options.partnerJwt, {
        sub: ctx.partnerPrincipalId,
        tenantId: ctx.tenantId,
      });
      const target = PARTNER_OPERATIONS[operation]!;
      const url = joinUrl(upstreamBase(target), target.buildPath({})) + (request.url.includes("?") ? request.url.slice(request.url.indexOf("?")) : "");

      const upstream = await fetch(url, {
        method: "GET",
        headers: { Authorization: `Bearer ${jwt}` },
      });
      reply.code(upstream.status);
      const body = await upstream.text();
      const contentType = upstream.headers.get("content-type");
      if (contentType) reply.header("content-type", contentType);
      return reply.send(body.length > 0 ? body : undefined);
    });

    fastify.get<{ Params: { patientId: string } }>(
      "/inbound/empi.getPatient/:patientId",
      async (request, reply) => {
        const ctx = await authenticate(request, reply);
        if (ctx === null) return;

        const operation = "empi.getPatient";
        if (!ctx.integration.config.allowedOperations.includes(operation)) {
          return sendInboundError(reply, 403, "INBOUND_OPERATION_NOT_ALLOWED");
        }

        const jwt = await mintPartnerJwt(options.partnerJwt, {
          sub: ctx.partnerPrincipalId,
          tenantId: ctx.tenantId,
        });
        const target = PARTNER_OPERATIONS[operation]!;
        const path = target.buildPath({ patientId: request.params.patientId });
        const url = joinUrl(upstreamBase(target), path);

        const upstream = await fetch(url, {
          method: "GET",
          headers: { Authorization: `Bearer ${jwt}` },
        });
        reply.code(upstream.status);
        const body = await upstream.text();
        const contentType = upstream.headers.get("content-type");
        if (contentType) reply.header("content-type", contentType);
        return reply.send(body.length > 0 ? body : undefined);
      },
    );
  };
}
