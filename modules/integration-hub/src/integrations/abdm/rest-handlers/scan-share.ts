/**
 * ABDM scan-and-share HTTP routes — thin: parse/validate → call a use-case with
 * injected deps (Drizzle repo + gateway + clock) → map result/errors. All
 * business logic lives in `../use-cases/scan-share/*`; SQL lives in
 * `../../data-access/abdm-scan-share.repo.ts`.
 *
 * Route partition is unchanged by the refactor:
 *  - `POST /hip/patient/share` stays on the un-gated inbound-callback scope (W2).
 *  - the `/scan-share/*` platform routes stay JWT-gated behind `integrationCtx`.
 */

import type { FastifyInstance, FastifyReply } from "fastify";
import type { DbInstance } from "@hims/ts-sdk-db";
import type { IntegrationHubSharedInfra } from "../../../lib/build-abdm-deps.js";
import { buildAbdmDepsForTenant } from "../../../lib/build-abdm-deps.js";
import { runInboundCallback } from "./m2/m2-inbound-helper.js";
import { DrizzleScanShareRepo } from "../data-access/abdm-scan-share.repo.js";
import {
  getShareStatus,
  issueShareToken,
  listActiveShares,
  lookupShareToken,
  prefillFromToken,
  redeemShareToken,
} from "../use-cases/scan-share/index.js";

function requireDb(shared: IntegrationHubSharedInfra): DbInstance {
  if (!shared.db) {
    throw new Error("integration hub database is not configured");
  }
  return shared.db;
}

function makeRepo(shared: IntegrationHubSharedInfra): DrizzleScanShareRepo {
  return new DrizzleScanShareRepo(requireDb(shared));
}

const now = (): Date => new Date();

export async function registerScanShareCallbackRoutes(
  app: FastifyInstance,
  sharedInfra: IntegrationHubSharedInfra,
): Promise<void> {
  app.post("/hip/patient/share", async (req, reply) => {
    await runInboundCallback({
      req,
      reply,
      flowKind: "abdm.scan-and-share.v1",
      httpStatus: 200,
      sharedInfra,
      handler: async ({ iqTenantId, requestId, body, deps }) => {
        const repo = makeRepo(sharedInfra);
        const integrationCtx = await buildAbdmDepsForTenant(iqTenantId, sharedInfra);
        await issueShareToken(
          {
            iqTenantId,
            facilityIdRef: deps.xHipId,
            integrationId: integrationCtx.profile.id,
            requestId,
            xCmId: deps.xCmId,
            gatewayEnvironment: integrationCtx.profile.gatewayEnvironment,
            body,
          },
          { repo, gateway: deps.gateway, empi: deps.empi, now },
        );
      },
    });
  });
}

export async function registerScanShareRoutes(app: FastifyInstance): Promise<void> {
  app.get("/scan-share/status", async (req, reply: FastifyReply) => {
    const ctx = req.integrationCtx!;
    const shared = req.server.integrationHubSharedInfra!;
    const data = await getShareStatus(
      { profile: ctx.profile },
      { repo: shared.db ? new DrizzleScanShareRepo(shared.db) : null },
    );
    return reply.send({ data, message: "ok" });
  });

  app.get("/scan-share/active", async (req, reply: FastifyReply) => {
    const ctx = req.integrationCtx!;
    const shared = req.server.integrationHubSharedInfra!;
    const data = await listActiveShares(
      { iqTenantId: ctx.iqTenantId, facilityIdRef: ctx.deps.xHipId },
      { repo: makeRepo(shared), now },
    );
    return reply.send({ data, message: "ok" });
  });

  app.get("/scan-share/qr", async (req, reply: FastifyReply) => {
    const ctx = req.integrationCtx!;
    const shared = req.server.integrationHubSharedInfra!;
    const status = await getShareStatus(
      { profile: ctx.profile },
      { repo: shared.db ? new DrizzleScanShareRepo(shared.db) : null },
    );
    if (!status.available || !status.qr_value) {
      return reply.status(503).send({
        error: "ServiceUnavailable",
        message: status.reason ?? "Scan-and-share is not available",
      });
    }
    return reply.send({
      data: { qr_value: status.qr_value, is_live: status.is_live ?? false },
      message: "ok",
    });
  });

  app.get("/scan-share/lookup", async (req, reply: FastifyReply) => {
    const ctx = req.integrationCtx!;
    const shared = req.server.integrationHubSharedInfra!;
    const q = String((req.query as { q?: string }).q ?? "").trim();
    if (!q) {
      return reply.status(400).send({ error: "BadRequest", message: "q is required" });
    }
    const resolved = await lookupShareToken(
      { iqTenantId: ctx.iqTenantId, facilityIdRef: ctx.deps.xHipId, query: q },
      { repo: makeRepo(shared), now },
    );
    if (!resolved) {
      return reply.status(404).send({ error: "NotFound", message: "No active token found" });
    }
    return reply.send({ data: resolved, message: "ok" });
  });

  app.get("/scan-share/token/:tokenNumber/prefill", async (req, reply: FastifyReply) => {
    const ctx = req.integrationCtx!;
    const shared = req.server.integrationHubSharedInfra!;
    const tokenNumber = Number((req.params as { tokenNumber: string }).tokenNumber);
    if (!Number.isFinite(tokenNumber)) {
      return reply.status(400).send({ error: "BadRequest", message: "invalid token number" });
    }
    const resolved = await prefillFromToken(
      { iqTenantId: ctx.iqTenantId, facilityIdRef: ctx.deps.xHipId, tokenNumber },
      { repo: makeRepo(shared), now },
    );
    if (!resolved) {
      return reply.status(404).send({ error: "NotFound", message: "No active token found" });
    }
    return reply.send({ data: resolved, message: "ok" });
  });

  app.put("/scan-share/token/:tokenNumber/redeem", async (req, reply: FastifyReply) => {
    const ctx = req.integrationCtx!;
    const shared = req.server.integrationHubSharedInfra!;
    const tokenNumber = Number((req.params as { tokenNumber: string }).tokenNumber);
    if (!Number.isFinite(tokenNumber)) {
      return reply.status(400).send({ error: "BadRequest", message: "invalid token number" });
    }
    const ok = await redeemShareToken(
      { iqTenantId: ctx.iqTenantId, facilityIdRef: ctx.deps.xHipId, tokenNumber },
      { repo: makeRepo(shared), now },
    );
    if (!ok) {
      return reply
        .status(404)
        .send({ error: "NotFound", message: "Token not found or already redeemed" });
    }
    return reply.send({ data: { token_number: tokenNumber, redeemed: true }, message: "ok" });
  });
}
