import type { FastifyRequest } from "fastify";

export function normalizeUrl(url: string): string {
  const path = url.split("?")[0] ?? "";
  if (path.length > 1 && path.endsWith("/")) {
    return path.slice(0, -1);
  }
  return path;
}

export function resolveRoutePattern(
  request: FastifyRequest,
  prefix: string,
): string {
  const route = (request.routeOptions?.url ?? "") as string;
  const raw = route.length > 0 ? normalizeUrl(route) : normalizeUrl(request.url);
  return raw.startsWith(prefix) ? raw.slice(prefix.length) || "/" : raw;
}

export function resolvePathParam(
  request: FastifyRequest,
  name = "id",
): string | null {
  const params = request.params;
  if (params == null || typeof params !== "object") return null;
  const id = (params as Record<string, unknown>)[name];
  return typeof id === "string" && id.length > 0 ? id : null;
}

export function iqTenantAttr(request: FastifyRequest): { iq_tenant_id: string } {
  return { iq_tenant_id: request.user.tenantId };
}
