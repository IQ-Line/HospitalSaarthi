import type { FastifyInstance } from "fastify";
import {
  buildDeploymentGatewayClient,
  type IntegrationHubSharedInfra,
} from "../../../../lib/build-abdm-deps.js";
import { IntegrationProfileNotFoundError } from "../../../../lib/integration-hub-errors.js";
import { AbdmGatewayError } from "../../lib/gateway-errors.js";
import { findBridgeServices } from "../../use-cases/m0/find-bridge-services.js";
import { getMappedFacilityIds } from "../../use-cases/m0/get-mapped-facility-ids.js";

function mapDiscoveryError(err: unknown, reply: { status: (code: number) => { send: (body: unknown) => unknown } }) {
  if (err instanceof AbdmGatewayError) {
    return reply.status(502).send({
      ok: false,
      error: {
        message: err.message,
        statusCode: err.statusCode,
        code: err.abdmCode ?? null,
      },
    });
  }
  if (err instanceof IntegrationProfileNotFoundError) {
    return reply.status(404).send({
      ok: false,
      error: {
        message: err.message,
        code: err.code,
      },
    });
  }
  if (err instanceof Error && err.message.includes("configurator")) {
    return reply.status(503).send({
      success: false,
      error: err.message,
    });
  }
  throw err;
}

/**
 * Bridge discovery routes. Deployment-scoped by definition: they enumerate the NHA
 * bridge's registered services under the DEPLOYMENT's gateway credentials, never a
 * tenant's. The gateway is built from env config only — a client-supplied
 * `x-tenant-id` header must NOT select which credentials are used (that was the
 * header-trust hole). Identity is enforced upstream; the FE calls these authenticated.
 * Registered outside `integrationContextResolver`.
 */
export async function registerM0DiscoveryRoutes(
  app: FastifyInstance,
  sharedInfra: IntegrationHubSharedInfra,
): Promise<void> {
  app.get("/m0/bridge-services", async (_req, reply) => {
    try {
      const gateway = buildDeploymentGatewayClient(sharedInfra);
      const result = await findBridgeServices({ gateway });
      return reply.send(result);
    } catch (err) {
      return mapDiscoveryError(err, reply);
    }
  });

  app.get("/tenant/mapped-facility-ids", async (_req, reply) => {
    try {
      const gateway = buildDeploymentGatewayClient(sharedInfra);
      const data = await getMappedFacilityIds({
        gateway,
        profiles: sharedInfra.profiles,
      });
      return reply.send({ success: true, data });
    } catch (err) {
      return mapDiscoveryError(err, reply);
    }
  });
}
