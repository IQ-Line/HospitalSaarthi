import type { FastifyInstance, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import type { Value } from "@cerbos/core";
import type { AuthzPluginOptions, CheckResult, PlanResult } from "./types.js";
import { closeCerbosClient, getCerbosClient } from "./client.js";
import { DecisionCache } from "./decision-cache.js";

const CACHE_KEY = Symbol("authzDecisionCache");

function getCache(request: FastifyRequest): DecisionCache {
  let cache = (request as Record<symbol, DecisionCache>)[CACHE_KEY];
  if (!cache) {
    cache = new DecisionCache();
    (request as Record<symbol, DecisionCache>)[CACHE_KEY] = cache;
  }
  return cache;
}

async function authzPluginFn(
  fastify: FastifyInstance,
  options: AuthzPluginOptions,
): Promise<void> {
  const cerbos = getCerbosClient(options);

  fastify.decorateRequest("checkResource", null);
  fastify.decorateRequest("planResources", null);

  fastify.addHook("onRequest", async (request: FastifyRequest) => {
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
          id: request.user.userId,
          roles: request.user.roles,
          attr: {
            iq_tenant_id: request.user.tenantId,
            org_id: request.user.orgId,
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
          id: request.user.userId,
          roles: request.user.roles,
          attr: {
            iq_tenant_id: request.user.tenantId,
            org_id: request.user.orgId,
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

  fastify.addHook("onClose", () => {
    closeCerbosClient();
  });
}

export const authzPlugin = fp(authzPluginFn, {
  fastify: "5.x",
  name: "@hims/ts-sdk-authz",
  dependencies: ["@hims/ts-sdk-identity"],
});
