import type { FastifyRequest } from "fastify";
import type { GatewayClient } from "../integrations/abdm/ports.js";
import {
  buildAbdmDepsForTenant,
  buildDeploymentGatewayClient,
  type IntegrationHubSharedInfra,
} from "./build-abdm-deps.js";

function asSingleHeaderValue(
  value: string | string[] | undefined,
): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function tenantIdFromRequest(req: FastifyRequest): string | undefined {
  const fromPlugin = req.tenantId?.trim();
  if (fromPlugin) return fromPlugin;
  return asSingleHeaderValue(
    req.headers["x-tenant-id"] as string | string[] | undefined,
  )?.trim();
}

/** Tenant-scoped gateway when `x-tenant-id` is set; otherwise deployment env credentials. */
export async function resolveGatewayForRequest(
  req: FastifyRequest,
  sharedInfra: IntegrationHubSharedInfra,
): Promise<GatewayClient> {
  const tenantId = tenantIdFromRequest(req);
  if (tenantId) {
    const ctx = await buildAbdmDepsForTenant(tenantId, sharedInfra);
    return ctx.deps.gateway;
  }
  return buildDeploymentGatewayClient(sharedInfra);
}
