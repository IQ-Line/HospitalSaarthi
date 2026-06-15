import type { FastifyInstance, FastifyReply } from "fastify";
import type { IntegrationHubSharedInfra } from "../../../../lib/build-abdm-deps.js";
import { IntegrationProfileNotFoundError } from "../../../../lib/integration-hub-errors.js";

function himsEnvelope(reply: FastifyReply, payload: {
  data: unknown;
  message: string;
  runningToken?: number;
}) {
  return reply.status(200).send({
    code: 200,
    ...payload,
  });
}

function requireIntegrationCtx(req: { integrationCtx?: { iqTenantId: string; profile: { hipId: string } } }) {
  const ctx = req.integrationCtx;
  if (!ctx) {
    throw new Error("integrationCtx missing");
  }
  return ctx;
}

export async function registerScanShareRoutes(
  app: FastifyInstance,
  sharedInfra: IntegrationHubSharedInfra,
): Promise<void> {
  app.post("/token/patient-with-token-id-list", async (req, reply) => {
    try {
      const ctx = requireIntegrationCtx(req);
      const body = (req.body ?? {}) as { aabha_address?: string; token?: number };
      const result = await sharedInfra.shareTokens.listActive({
        iqTenantId: ctx.iqTenantId,
        facilityIdRef: ctx.profile.hipId,
        aabhaAddress: body.aabha_address,
        token: body.token,
      });
      return himsEnvelope(reply, {
        data: result.docs,
        message: "Active scan-and-share tokens",
        runningToken: result.runningToken,
      });
    } catch (err) {
      if (err instanceof IntegrationProfileNotFoundError) {
        return reply.status(404).send({
          code: 404,
          message: "ABDM integration profile not configured for this tenant",
          data: [],
          runningToken: 0,
        });
      }
      throw err;
    }
  });

  app.post("/m1/patient/token", async (req, reply) => {
    const ctx = requireIntegrationCtx(req);
    const body = (req.body ?? {}) as { token_id?: number };
    const tokenId = Number(body.token_id);
    if (!Number.isInteger(tokenId) || tokenId <= 0) {
      return reply.status(400).send({
        code: 400,
        message: "token_id must be a positive integer",
      });
    }
    const doc = await sharedInfra.shareTokens.findByToken({
      iqTenantId: ctx.iqTenantId,
      facilityIdRef: ctx.profile.hipId,
      tokenId,
    });
    if (!doc) {
      return reply.status(404).send({
        code: 404,
        message: "Token not found or inactive",
      });
    }
    return himsEnvelope(reply, {
      data: doc,
      message: "Token resolved",
    });
  });

  app.put("/m1/patient/token", async (req, reply) => {
    const ctx = requireIntegrationCtx(req);
    const body = (req.body ?? {}) as { token_id?: number };
    const tokenId = Number(body.token_id);
    if (!Number.isInteger(tokenId) || tokenId <= 0) {
      return reply.status(400).send({
        code: 400,
        message: "token_id must be a positive integer",
      });
    }
    const doc = await sharedInfra.shareTokens.deactivate({
      iqTenantId: ctx.iqTenantId,
      facilityIdRef: ctx.profile.hipId,
      tokenId,
    });
    if (!doc) {
      return reply.status(404).send({
        code: 404,
        message: "Token not found or already inactive",
      });
    }
    return himsEnvelope(reply, {
      data: doc,
      message: "Token deactivated",
    });
  });
}
