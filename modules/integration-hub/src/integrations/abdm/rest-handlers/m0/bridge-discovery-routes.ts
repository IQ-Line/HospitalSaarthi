import type { FastifyInstance } from "fastify";
import type { IntegrationHubSharedInfra } from "../../../../lib/build-abdm-deps.js";
import { IntegrationProfileNotFoundError } from "../../../../lib/integration-hub-errors.js";
import { resolveGatewayForRequest } from "../../../../lib/resolve-gateway-for-request.js";
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
 * Bridge discovery routes — optional `x-tenant-id` (deployment credentials when omitted).
 * Registered outside `integrationContextResolver`.
 */
export async function registerM0DiscoveryRoutes(
  app: FastifyInstance,
  sharedInfra: IntegrationHubSharedInfra,
): Promise<void> {
  app.get("/m0/bridge-services", async (req, reply) => {
    try {
      const gateway = await resolveGatewayForRequest(req, sharedInfra);
      const result = await findBridgeServices({ gateway });
      return reply.send(result);
    } catch (err) {
      return mapDiscoveryError(err, reply);
    }
  });

  app.get("/tenant/mapped-facility-ids", async (req, reply) => {
    try {
      const gateway = await resolveGatewayForRequest(req, sharedInfra);
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
