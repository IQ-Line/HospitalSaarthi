import type { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const TENANT_LIST_PATH = "/api/configurator/v1/tenants";

function pathWithoutQuery(url: string): string {
  let raw = url.split("?")[0] ?? "";
  if (!raw.startsWith("/")) {
    raw = `/${raw}`;
  }
  if (raw.length > 1 && raw.endsWith("/")) {
    return raw.slice(0, -1);
  }
  return raw;
}

/** GET tenant catalog reads — skip JWT; no tenant header required (platform scope). */
export function isConfiguratorPublicTenantRead(method: string, url: string): boolean {
  if (method !== "GET") {
    return false;
  }
  const path = pathWithoutQuery(url);
  if (path === TENANT_LIST_PATH) {
    return true;
  }
  const prefix = `${TENANT_LIST_PATH}/`;
  if (!path.startsWith(prefix)) {
    return false;
  }
  const id = path.slice(prefix.length);
  return UUID_RE.test(id) && !id.includes("/");
}

const configuratorPublicTenantReadAuthPluginImpl: FastifyPluginAsync = async (fastify) => {
  if (!fastify.hasRequestDecorator("authViaApiKey")) {
    fastify.decorateRequest("authViaApiKey", false);
  }

  fastify.addHook("onRequest", async (request) => {
    if (!isConfiguratorPublicTenantRead(request.method, request.url)) {
      return;
    }
    request.authViaApiKey = true;
  });
};

export const configuratorPublicTenantReadAuthPlugin = fp(
  configuratorPublicTenantReadAuthPluginImpl,
  {
    fastify: "5.x",
    name: "@hims/configurator-public-tenant-read-auth",
  },
);
