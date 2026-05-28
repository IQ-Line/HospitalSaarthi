import type { FastifyInstance, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import type { Value } from "@cerbos/core";
import { forbidden } from "@hims/ts-sdk-http";
import type {
  AuthzPluginOptions,
  AuthzTarget,
  CheckResult,
  InlineAuthzTarget,
  PlanResult,
  RouteAuthMode,
} from "./types.js";
import { closeCerbosClient, getCerbosClient } from "./client.js";
import { DecisionCache } from "./decision-cache.js";
import { buildCerbosPrincipalWire } from "./principal-wire.js";

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

const PROBE_UUID = "00000000-0000-0000-0000-000000000000";

function extractRouteParams(path: string): Record<string, string> {
  const normalizedPath = normalizePath(path);
  const segments = normalizedPath.split("/");
  const params: Record<string, string> = {};
  for (const segment of segments) {
    if (!segment.startsWith(":")) continue;
    const key = segment.slice(1);
    if (key.length > 0) {
      params[key] = PROBE_UUID;
    }
  }
  return params;
}

function resolveRouteAuthMode(config: unknown): RouteAuthMode {
  if (config == null || typeof config !== "object") {
    return "public";
  }
  return (config as { authMode?: RouteAuthMode }).authMode ?? "public";
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

function autoInferId(request: FastifyRequest): string {
  const params = request.params as Record<string, string> | undefined;
  if (params) {
    if (params.id !== undefined && params.id !== "") return params.id;
    const values = Object.values(params).filter((v) => v !== undefined && v !== "");
    if (values.length > 0) return values[0];
  }
  return "";
}

async function resolveInlineTarget(
  request: FastifyRequest,
  inline: InlineAuthzTarget,
): Promise<AuthzTarget> {
  const id = typeof inline.id === "function"
    ? await inline.id(request)
    : (inline.id ?? autoInferId(request));

  const userAttr = inline.resolveAttr
    ? await inline.resolveAttr(request)
    : undefined;

  const attr: Record<string, Value> = {
    iq_tenant_id: (request as unknown as { tenantId?: string }).tenantId ?? "",
    ...(userAttr ?? {}),
  };

  return { kind: inline.kind, id, action: inline.action, attr };
}

function routeHasParams(routeKey: string): boolean {
  return routeKey.includes(":");
}

async function validateInlineTarget(routeKey: string, target: InlineAuthzTarget): Promise<void> {
  if (!target.kind || !target.action) {
    throw new Error(`AuthZ mapping incomplete (inline): ${routeKey}`);
  }
  if (!target.id && !routeHasParams(routeKey)) {
    throw new Error(
      `AuthZ mapping incomplete (inline): ${routeKey} — id required when route has no path params`,
    );
  }
}

async function probeResolverTarget(
  routeKey: string,
  resolveTarget: NonNullable<AuthzPluginOptions["resolveTarget"]>,
): Promise<void> {
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
      userId: PROBE_UUID,
      tenantId: PROBE_UUID,
      roles: [],
      orgId: null,
    },
  } as unknown as FastifyRequest;
  const target = await resolveTarget(probeRequest);
  if (target === null || target === undefined) {
    throw new Error(`AuthZ mapping incomplete: ${routeKey}`);
  }
}

async function resolveProtectionTarget(
  request: FastifyRequest,
  inline: InlineAuthzTarget | undefined,
  resolveTarget: AuthzPluginOptions["resolveTarget"],
  routeKey: string,
): Promise<AuthzTarget> {
  if (inline) {
    return resolveInlineTarget(request, inline);
  }
  if (resolveTarget) {
    const target = await resolveTarget(request);
    if (target === null || target === undefined) {
      throw new Error(`AuthZ mapping incomplete: ${routeKey}`);
    }
    return target;
  }
  throw new Error(`AuthZ mapping incomplete: ${routeKey}`);
}

async function authzPluginFn(
  fastify: FastifyInstance,
  options: AuthzPluginOptions,
): Promise<void> {
  const cerbos = getCerbosClient(options);
  const protectedRouteKeys = new Set<string>();
  const inlineTargets = new Map<string, InlineAuthzTarget>();

  fastify.addHook("onRoute", (routeOptions) => {
    for (const routeKey of toRouteKeys(routeOptions.method, routeOptions.url)) {
      const authMode = resolveRouteAuthMode(routeOptions.config);
      if (authMode === "protected") {
        protectedRouteKeys.add(routeKey);
        const config = routeOptions.config as { authz?: InlineAuthzTarget } | undefined;
        if (config?.authz) {
          inlineTargets.set(routeKey, config.authz);
        }
      }
    }
  });

  fastify.addHook("onReady", async () => {
    for (const routeKey of protectedRouteKeys) {
      const inline = inlineTargets.get(routeKey);
      if (inline) {
        await validateInlineTarget(routeKey, inline);
      } else if (options.resolveTarget) {
        await probeResolverTarget(routeKey, options.resolveTarget);
      } else {
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
    request.checkResource = async (
      kind: string,
      id: string,
      action: string,
      attr?: Record<string, Value>,
    ): Promise<CheckResult> => {
      /**
       * Read `request.user` at check time (not when this hook runs) so principal
       * enrichment plugins registered before this PEP see their DB-backed attrs.
       */
      const cache = getCache(request);
      const cached = cache.getCheck(kind, id, action);
      if (cached) return cached;

      const result = await cerbos.checkResource({
        principal: buildCerbosPrincipalWire(request),
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
        principal: buildCerbosPrincipalWire(request),
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
    if (authMode !== "protected") {
      return;
    }

    const inline = inlineTargets.get(routeKey);
    const target = await resolveProtectionTarget(request, inline, options.resolveTarget, routeKey);

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
  dependencies: ["@hims/ts-sdk-identity", "@hims/user-management-principal-enrichment"],
});
