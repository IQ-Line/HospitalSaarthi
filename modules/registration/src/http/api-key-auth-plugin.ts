import {
  extractTenantApiKeyPrefix,
  isTenantApiKeySecret,
} from "@hims/ts-sdk-api-key";
import { unauthorized } from "@hims/ts-sdk-http";
import type { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import type { ApiKeyValidatorPort } from "../ports.js";

export interface ApiKeyAuthPluginOptions {
  validator: ApiKeyValidatorPort;
}

const REGISTRATION_OPD_SLIP_PDF_PATH =
  /\/registrations\/[^/]+\/documents\/opd-slip\.pdf$/;
const PARTNER_OPD_SLIP_PDF_PATH = /\/documents\/opd-slip\.pdf$/;

function readApiKeyHeader(
  value: string | string[] | undefined,
): string | undefined {
  if (Array.isArray(value)) return value[0]?.trim();
  return typeof value === "string" ? value.trim() : undefined;
}

function isRegistrationOpdSlipPdfRequest(url: string): boolean {
  const path = url.split("?")[0] ?? "";
  return REGISTRATION_OPD_SLIP_PDF_PATH.test(path);
}

function isPartnerOpdSlipPdfRequest(url: string, method: string): boolean {
  const path = url.split("?")[0] ?? "";
  return method === "POST" && PARTNER_OPD_SLIP_PDF_PATH.test(path);
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
    const partnerRequest = isPartnerOpdSlipPdfRequest(request.url, request.method);
    const registrationRequest = isRegistrationOpdSlipPdfRequest(request.url);
    if (!partnerRequest && !registrationRequest) return;

    const secret = readApiKeyHeader(request.headers["x-api-key"]);
    if (!secret) {
      if (partnerRequest) {
        unauthorized(reply, request, "API_KEY_REQUIRED", "X-API-Key header is required");
      }
      return;
    }

    const prefix = extractTenantApiKeyPrefix(secret);
    const validated = await (async () => {
      if (!isTenantApiKeySecret(secret)) return null;
      if (!prefix) return null;
      return options.validator.validateOpdSlipKey(prefix, secret);
    })();

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
