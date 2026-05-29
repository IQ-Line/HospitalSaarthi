import type { FastifyInstance } from "fastify";
import type { IntegrationHubSharedInfra } from "../../../../lib/build-abdm-deps.js";
import { buildAbdmDepsForTenant } from "../../../../lib/build-abdm-deps.js";
import { IntegrationProfileNotFoundError } from "../../../../lib/integration-hub-errors.js";
import { runInboundCallback } from "../m2/m2-inbound-helper.js";
import { handleOnInitCallback } from "../../use-cases/m3/hiu/handle-on-init-callback.js";
import { handleNotifyCallback } from "../../use-cases/m3/hiu/handle-notify-callback.js";
import { handleOnFetchCallback } from "../../use-cases/m3/hiu/handle-on-fetch-callback.js";
import { handleOnDataRequestCallback } from "../../use-cases/m3/hiu/handle-on-data-request-callback.js";
import { handleBundlePush } from "../../use-cases/m3/hiu/handle-bundle-push.js";
import { resolveInboundRequestId } from "../../lib/resolve-callback-tenant.js";
import type { EncryptedBundlePushBody } from "@hims/ts-sdk-abha/protocol/m3/hiu-data-fetch.js";

export async function registerM3CallbackRoutes(
  app: FastifyInstance,
  sharedInfra: IntegrationHubSharedInfra,
): Promise<void> {
  app.post("/hiu/consent/request/on-init", async (req, reply) => {
    await runInboundCallback({
      req,
      reply,
      flowKind: "abdm.m3.hiu.v1",
      httpStatus: 200,
      sharedInfra,
      handler: async (ctx) => {
        await handleOnInitCallback(
          {
            iqTenantId: ctx.iqTenantId,
            inboundRequestId: ctx.requestId,
            ...(ctx.body as object),
          },
          ctx.deps,
        );
      },
    });
  });

  app.post("/hiu/consent/request/notify", async (req, reply) => {
    await runInboundCallback({
      req,
      reply,
      flowKind: "abdm.m3.hiu.v1",
      httpStatus: 200,
      sharedInfra,
      handler: async (ctx) => {
        await handleNotifyCallback(
          {
            iqTenantId: ctx.iqTenantId,
            inboundRequestId: ctx.requestId,
            ...(ctx.body as object),
          },
          ctx.deps,
        );
      },
    });
  });

  app.post("/hiu/consent/on-fetch", async (req, reply) => {
    await runInboundCallback({
      req,
      reply,
      flowKind: "abdm.m3.hiu.v1",
      httpStatus: 200,
      sharedInfra,
      handler: async (ctx) => {
        await handleOnFetchCallback(
          {
            iqTenantId: ctx.iqTenantId,
            inboundRequestId: ctx.requestId,
            ...(ctx.body as object),
          },
          ctx.deps,
        );
      },
    });
  });

  app.post("/hiu/health-information/on-request", async (req, reply) => {
    await runInboundCallback({
      req,
      reply,
      flowKind: "abdm.m3.hiu.v1",
      httpStatus: 200,
      sharedInfra,
      handler: async (ctx) => {
        await handleOnDataRequestCallback(
          {
            iqTenantId: ctx.iqTenantId,
            inboundRequestId: ctx.requestId,
            ...(ctx.body as object),
          },
          ctx.deps,
        );
      },
    });
  });

  app.post("/hiu/health-information/transfer/:transferId", async (req, reply) => {
    const headers = req.headers as Record<string, unknown>;
    const transferId = (req.params as { transferId: string }).transferId;
    let iqTenantId = String(headers["x-tenant-id"] ?? headers["X-Tenant-Id"] ?? "").trim();

    if (!iqTenantId) {
      const lookupDeps = sharedInfra.m3DataTransfers;
      const row = await lookupDeps.findByTransferId(transferId);
      if (!row) {
        return reply.code(404).send({ error: "NotFound", message: "transfer not found" });
      }
      iqTenantId = row.iqTenantId;
    }

    let deps;
    try {
      deps = (await buildAbdmDepsForTenant(iqTenantId, sharedInfra)).deps;
    } catch (e) {
      if (e instanceof IntegrationProfileNotFoundError) {
        return reply.code(404).send({
          error: "NotFound",
          message: e.message,
          code: e.code,
        });
      }
      throw e;
    }

    let pushRequestId = "";
    try {
      pushRequestId = resolveInboundRequestId(headers, req.body);
    } catch {
      pushRequestId = String(headers["request-id"] ?? headers["REQUEST-ID"] ?? "").trim();
    }
    const dedupeRequestId = pushRequestId
      ? `transfer-push:${transferId}:${pushRequestId}`
      : `transfer-push:${transferId}`;

    const isNew = await deps.inboundMessages.insertIfNew({
      iqTenantId,
      requestId: dedupeRequestId,
      flowKind: "abdm.m3.hiu.transfer-push.v1",
    });
    if (!isNew) {
      return reply.code(200).send();
    }
    const inboundRequestId = pushRequestId || transferId;
    try {
      await handleBundlePush(
        {
          iqTenantId,
          transferId,
          body: req.body as EncryptedBundlePushBody,
          inboundRequestId,
        },
        deps,
      );
    } catch (e) {
      await deps.inboundMessages.release({ iqTenantId, requestId: dedupeRequestId });
      throw e;
    }
    return reply.code(200).send();
  });
}
