import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { DbInstance } from "@hims/ts-sdk-db";
import { verifyApiKeySecret } from "../control-plane/lib/api-key-crypto.js";
import { DrizzleIntegrationApiKeyRepository } from "../control-plane/data-access/integration-api-key-repository.js";
import { DrizzleIntegrationRepository } from "../control-plane/data-access/integration-repository.js";
import type { Integration } from "../control-plane/domain/integration.types.js";
import { mintPartnerJwt, type PartnerJwtSignerConfig } from "./partner-jwt.js";
import {
  PARTNER_INBOUND_OPERATIONS,
  type PartnerInboundUpstream,
} from "./partner-inbound-operations.js";
import { parseInboundApiKey } from "./parse-inbound-api-key.js";

export { loadPartnerJwtSignerFromEnv } from "./partner-jwt.js";

const KEY_PREFIX_LEN = 16;

type InboundRouteRegistration = {
  operation: string;
  path: string;
  paramNames: string[];
};

const INBOUND_ROUTES: readonly InboundRouteRegistration[] = [
  { operation: "registration.listRegistrations", path: "/inbound/registration.listRegistrations", paramNames: [] },
  { operation: "empi.getPatient", path: "/inbound/empi.getPatient/:patientId", paramNames: ["patientId"] },
  { operation: "configurator.listTenants", path: "/inbound/configurator.listTenants", paramNames: [] },
  {
    operation: "configurator.listTenantModules",
    path: "/inbound/configurator.listTenantModules/:tenantId",
    paramNames: ["tenantId"],
  },
  { operation: "masterData.listModules", path: "/inbound/masterData.listModules", paramNames: [] },
];

export type { PartnerJwtSignerConfig } from "./partner-jwt.js";

export type InboundRouterOptions = {
  db: DbInstance;
  registrationBaseUrl: string;
  empiBaseUrl: string;
  configuratorBaseUrl: string;
  masterDataBaseUrl: string;
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

function sendInboundError(
  reply: FastifyReply,
  status: number,
  code: string,
  message?: string,
): void {
  void reply.code(status).send({ code, message });
}

function upstreamBase(
  upstream: PartnerInboundUpstream,
  options: InboundRouterOptions,
): string {
  switch (upstream) {
    case "registration":
      return options.registrationBaseUrl;
    case "empi":
      return options.empiBaseUrl;
    case "configurator":
      return options.configuratorBaseUrl;
    case "master_data":
      return options.masterDataBaseUrl;
  }
}

function readPathParams(
  request: FastifyRequest,
  paramNames: readonly string[],
): Record<string, string> {
  const params = (request.params ?? {}) as Record<string, string>;
  const out: Record<string, string> = {};
  for (const name of paramNames) {
    const value = params[name];
    if (typeof value === "string") {
      out[name] = value;
    }
  }
  return out;
}

function passthroughQuery(request: FastifyRequest): string {
  const idx = request.url.indexOf("?");
  return idx >= 0 ? request.url.slice(idx) : "";
}

export function createInboundRouter(options: InboundRouterOptions) {
  const apiKeys = new DrizzleIntegrationApiKeyRepository(options.db);
  const integrations = new DrizzleIntegrationRepository(options.db);

  async function authenticate(request: FastifyRequest, reply: FastifyReply): Promise<InboundContext | null> {
    const apiKey = parseInboundApiKey(request);
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

  async function proxyInboundGet(
    operation: string,
    request: FastifyRequest,
    reply: FastifyReply,
    pathParams: Record<string, string>,
  ): Promise<void> {
    const ctx = await authenticate(request, reply);
    if (ctx === null) return;

    if (!ctx.integration.config.allowedOperations.includes(operation)) {
      sendInboundError(reply, 403, "INBOUND_OPERATION_NOT_ALLOWED");
      return;
    }

    const target = PARTNER_INBOUND_OPERATIONS[operation];
    if (target === undefined) {
      sendInboundError(reply, 404, "INBOUND_OPERATION_UNKNOWN");
      return;
    }

    const headers: Record<string, string> = {};
    if (target.usePartnerJwt) {
      const jwt = await mintPartnerJwt(options.partnerJwt, {
        sub: ctx.partnerPrincipalId,
        tenantId: ctx.tenantId,
      });
      headers.Authorization = `Bearer ${jwt}`;
    }

    const url =
      joinUrl(upstreamBase(target.upstream, options), target.buildPath(pathParams)) +
      passthroughQuery(request);

    const upstream = await fetch(url, { method: "GET", headers });
    reply.code(upstream.status);
    const body = await upstream.text();
    const contentType = upstream.headers.get("content-type");
    if (contentType) reply.header("content-type", contentType);
    void reply.send(body.length > 0 ? body : undefined);
  }

  return async function inboundDataPlaneRouter(fastify: FastifyInstance) {
    fastify.get("/.well-known/jwks.json", async (_request, reply) => {
      return reply.send({ keys: [options.partnerJwt.publicJwk] });
    });

    for (const route of INBOUND_ROUTES) {
      fastify.get(route.path, async (request, reply) => {
        await proxyInboundGet(
          route.operation,
          request,
          reply,
          readPathParams(request, route.paramNames),
        );
      });
    }
  };
}
