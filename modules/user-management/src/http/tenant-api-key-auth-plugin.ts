import {
  extractTenantApiKeyPrefix,
  isTenantApiKeySecret,
} from "@hims/ts-sdk-api-key";
import { unauthorized } from "@hims/ts-sdk-http";
import type { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import type { TenantApiKeyValidatorPort } from "../ports/tenant-api-key-validator.js";

export interface TenantApiKeyAuthPluginOptions {
  validator: TenantApiKeyValidatorPort;
}

const UM_API_PREFIX = "/api/user-management";

function readApiKeyHeader(
  value: string | string[] | undefined,
): string | undefined {
  if (Array.isArray(value)) return value[0]?.trim();
  return typeof value === "string" ? value.trim() : undefined;
}

/** Strip gateway prefix so matchers work inside or outside the UM Fastify scope. */
function umRelativePath(url: string): string {
  const path = (url.split("?")[0] ?? "").replace(/\/+$/, "") || "/";
  if (path.startsWith(UM_API_PREFIX)) {
    const relative = path.slice(UM_API_PREFIX.length);
    return relative.length > 0 ? relative : "/";
  }
  return path;
}

function isUmApiKeyReadRoute(url: string, method: string): boolean {
  if (method !== "GET") return false;
  const path = umRelativePath(url);
  if (path === "/roles") return true;
  if (path === "/users") return true;
  if (/^\/users\/[^/]+\/roles$/.test(path)) return true;
  return false;
}

const tenantApiKeyAuthPluginImpl: FastifyPluginAsync<TenantApiKeyAuthPluginOptions> = async (
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
    if (!isUmApiKeyReadRoute(request.url, request.method)) return;

    const secret = readApiKeyHeader(request.headers["x-api-key"]);
    if (!secret) return;

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

export const tenantApiKeyAuthPlugin = fp(tenantApiKeyAuthPluginImpl, {
  fastify: "5.x",
  name: "@hims/user-management-tenant-api-key-auth",
});
