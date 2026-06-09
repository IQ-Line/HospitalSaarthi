import {
  extractTenantApiKeyPrefix,
  isTenantApiKeySecret,
} from "@hims/ts-sdk-api-key";
import { unauthorized } from "@hims/ts-sdk-http";
import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import type { ApiKeyValidatorPort } from "../ports.js";

export interface ApiKeyAuthPluginOptions {
  validator: ApiKeyValidatorPort;
}

const OPD_SLIP_PDF_PATH =
  /\/registrations\/[^/]+\/documents\/opd-slip\.pdf$/;

function readApiKeyHeader(
  value: string | string[] | undefined,
): string | undefined {
  if (Array.isArray(value)) return value[0]?.trim();
  return typeof value === "string" ? value.trim() : undefined;
}

function isOpdSlipPdfRequest(url: string): boolean {
  const path = url.split("?")[0] ?? "";
  return OPD_SLIP_PDF_PATH.test(path);
}

const apiKeyAuthPluginImpl: FastifyPluginAsync<ApiKeyAuthPluginOptions> = async (
  fastify,
  options,
) => {
  if (!fastify.hasRequestDecorator("tenantId")) {
    fastify.decorateRequest("tenantId", "");
  }
  if (!fastify.hasRequestDecorator("authViaApiKey")) {
    fastify.decorateRequest("authViaApiKey", false);
  }

  fastify.addHook("onRequest", async (request, reply) => {
    if (!isOpdSlipPdfRequest(request.url)) return;

    const secret = readApiKeyHeader(request.headers["x-api-key"]);
    if (!secret) return;

    if (!isTenantApiKeySecret(secret)) {
      unauthorized(reply, request, "API_KEY_INVALID", "Invalid API key");
      return;
    }

    const prefix = extractTenantApiKeyPrefix(secret);
    if (!prefix) {
      unauthorized(reply, request, "API_KEY_INVALID", "Invalid API key");
      return;
    }

    const validated = await options.validator.validateOpdSlipKey(prefix, secret);
    if (!validated) {
      unauthorized(reply, request, "API_KEY_INVALID", "Invalid API key");
      return;
    }

    request.authViaApiKey = true;
    request.tenantId = validated.tenantId;
  });
};

export const apiKeyAuthPlugin = fp(apiKeyAuthPluginImpl, {
  fastify: "5.x",
  name: "@hims/registration-api-key-auth",
});
