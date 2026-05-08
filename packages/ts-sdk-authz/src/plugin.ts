import type { FastifyInstance, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import type { Value } from "@cerbos/core";
import type { Principal } from "@hims/ts-sdk-identity";
import type { AuthzPluginOptions, CheckResult, PlanResult } from "./types.js";
import { closeCerbosClient, getCerbosClient } from "./client.js";
import { DecisionCache } from "./decision-cache.js";

const CACHE_KEY = Symbol("authzDecisionCache");

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
          roles: principal.roles,
          attr: {
            iq_tenant_id: principal.tenantId,
            org_id: principal.orgId,
          },
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
          roles: principal.roles,
          attr: {
            iq_tenant_id: principal.tenantId,
            org_id: principal.orgId,
          },
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

    if (!options.resolveTarget) {
      return;
    }

    const target = await options.resolveTarget(request);
    if (target === null || target === undefined) {
      return;
    }

    const result = await request.checkResource(
      target.kind,
      target.id,
      target.action,
      target.attr,
    );

    if (!result.isAllowed(target.action)) {
      reply.code(403).send({ error: "Forbidden" });
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
