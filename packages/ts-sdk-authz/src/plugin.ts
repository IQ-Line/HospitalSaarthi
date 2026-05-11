import type { FastifyInstance, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import type { Value } from "@cerbos/core";
import { forbidden } from "@hims/ts-sdk-http";
import type { Principal } from "@hims/ts-sdk-identity";
import type {
  AuthzPluginOptions,
  CheckResult,
  PlanResult,
  RouteAuthMode,
} from "./types.js";
import { closeCerbosClient, getCerbosClient } from "./client.js";
import { DecisionCache } from "./decision-cache.js";
import { principalAttrsForCerbos } from "./principal-attr.js";

const CACHE_KEY = Symbol("authzDecisionCache");

function normalizePath(path: string): string {
  if (path.length > 1 && path.endsWith("/")) {
    return path.slice(0, -1);
  }
  return path;
}

function toRouteKeys(method: string | string[] | undefined, path: string): string[] {
  if (!method) return [];
  const normalizedPath = normalizePath(path);
  if (Array.isArray(method)) {
    return method.map((m) => `${m.toUpperCase()} ${normalizedPath}`);
  }
  return [`${method.toUpperCase()} ${normalizedPath}`];
}

function extractRouteParams(path: string): Record<string, string> {
  const normalizedPath = normalizePath(path);
  const segments = normalizedPath.split("/");
  const params: Record<string, string> = {};
  for (const segment of segments) {
    if (!segment.startsWith(":")) continue;
    const key = segment.slice(1);
    if (key.length > 0) {
      params[key] = `probe-${key}`;
    }
  }
  return params;
}

function resolveRouteAuthMode(config: unknown): RouteAuthMode {
  return (config as { authMode: RouteAuthMode }).authMode;
}

function routeKeyFromRequest(request: FastifyRequest): string {
  const routePattern = (request.routeOptions?.url ?? request.url) as string;
  return `${request.method.toUpperCase()} ${normalizePath(routePattern)}`;
}

function getCache(request: FastifyRequest): DecisionCache {
  const cacheHolder = request as unknown as Record<symbol, DecisionCache>;
  let cache = cacheHolder[CACHE_KEY];
  if (!cache) {
    cache = new DecisionCache();
    cacheHolder[CACHE_KEY] = cache;
  }
  return cache;
}

async function authzPluginFn(
  fastify: FastifyInstance,
  options: AuthzPluginOptions,
): Promise<void> {
  const cerbos = getCerbosClient(options);
  const protectedRouteKeys = new Set<string>();

  fastify.addHook("onRoute", (routeOptions) => {
    for (const routeKey of toRouteKeys(routeOptions.method, routeOptions.url)) {
      const authMode = resolveRouteAuthMode(routeOptions.config);
      if (authMode === "protected") {
        protectedRouteKeys.add(routeKey);
      }
    }
  });

  fastify.addHook("onReady", async () => {
    for (const routeKey of protectedRouteKeys) {
      if (!options.resolveTarget) {
        throw new Error(`AuthZ mapping incomplete: ${routeKey}`);
      }

      const [method, ...pathParts] = routeKey.split(" ");
      const path = pathParts.join(" ");
      const probeRequest = {
        method,
        url: path,
        routeOptions: {
          url: path,
          config: { authMode: "protected" },
        },
        params: extractRouteParams(path),
        user: {
          userId: "probe-user",
          tenantId: "probe-tenant",
          roles: [],
          orgId: null,
        },
      } as unknown as FastifyRequest;
      const target = await options.resolveTarget(probeRequest);
      if (target === null || target === undefined) {
        throw new Error(`AuthZ mapping incomplete: ${routeKey}`);
      }
    }
  });

  fastify.decorateRequest(
    "checkResource",
    undefined as unknown as FastifyRequest["checkResource"],
  );
  fastify.decorateRequest(
    "planResources",
    undefined as unknown as FastifyRequest["planResources"],
  );

  fastify.addHook("onRequest", async (request: FastifyRequest) => {
    /**
     * Intentionally consumes the shared identity SDK principal contract.
     * This keeps authz generic across services and avoids service-specific
     * `request.user` typing in `ts-sdk-authz`.
     */
    const principal: Principal = request.user;

    request.checkResource = async (
      kind: string,
      id: string,
      action: string,
      attr?: Record<string, Value>,
    ): Promise<CheckResult> => {
      const cache = getCache(request);
      const cached = cache.getCheck(kind, id, action);
      if (cached) return cached;

      const result = await cerbos.checkResource({
        principal: {
          id: principal.userId,
          /** Identity/context only — module policies should use `attr` (capabilities, tenant, etc.). */
          roles: principal.roles,
          attr: principalAttrsForCerbos(principal),
        },
        resource: { kind, id, ...(attr && { attr }) },
        actions: [action],
      });

      cache.setCheck(kind, id, action, result);
      return result;
    };

    request.planResources = async (
      kind: string,
      action: string,
      attr?: Record<string, Value>,
    ): Promise<PlanResult> => {
      const cache = getCache(request);
      const cached = cache.getPlan(kind, action);
      if (cached) return cached;

      const result = await cerbos.planResources({
        principal: {
          id: principal.userId,
          /** Identity/context only — module policies should use `attr` (capabilities, tenant, etc.). */
          roles: principal.roles,
          attr: principalAttrsForCerbos(principal),
        },
        resource: { kind, ...(attr && { attr }) },
        action,
      });

      cache.setPlan(kind, action, result);
      return result;
    };
  });

  fastify.addHook("onResponse", async (request: FastifyRequest) => {
    getCache(request).clear();
  });

  fastify.addHook("preHandler", async (request, reply) => {
    if (reply.sent) return;

    const routeKey = routeKeyFromRequest(request);
    const authMode = resolveRouteAuthMode(request.routeOptions?.config);
    if (authMode === "public") {
      return;
    }

    if (!options.resolveTarget) {
      throw new Error(`AuthZ mapping incomplete: ${routeKey}`);
    }

    const target = await options.resolveTarget(request);
    if (target === null || target === undefined) {
      throw new Error(`AuthZ mapping incomplete: ${routeKey}`);
    }

    const result = await request.checkResource(
      target.kind,
      target.id,
      target.action,
      target.attr,
    );

    if (!result.isAllowed(target.action)) {
      forbidden(reply, request, "AUTHZ_FORBIDDEN", "Forbidden");
    }
  });

  fastify.addHook("onClose", () => {
    closeCerbosClient();
  });
}

export const authzPlugin = fp(authzPluginFn, {
  fastify: "5.x",
  name: "@hims/ts-sdk-authz",
  dependencies: ["@hims/ts-sdk-identity"],
});
