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
import { resolveCallbackTenant, resolveInboundRequestId } from "../../lib/resolve-callback-tenant.js";
import type { TenantIntegrationProfile } from "../../../../lib/integration-context.js";
import type {
  ConsentNotifyCallback,
  EncryptedBundlePushBody,
  OnConsentFetchCallback,
  OnConsentInitCallback,
  OnHiuDataRequestCallback,
} from "@hims/ts-sdk-abha/protocol/m3";

/** Outcome of resolving the tenant for an encrypted bundle push. */
type TenantResolution =
  | { ok: true; iqTenantId: string; profile?: TenantIntegrationProfile }
  | { ok: false; message: string };

/** First non-empty, trimmed value among the given raw header values. */
const firstTrimmed = (...values: unknown[]): string => {
  for (const value of values) {
    const trimmed = String(value ?? "").trim();
    if (trimmed) return trimmed;
  }
  return "";
};

/**
 * Resolves the tenant for a bundle push: `x-tenant-id` header (then HIP-profile
 * match), else the `abdm_m3_data_transfers` row, else HIP/header resolution.
 */
async function resolveBundlePushTenant(
  headers: Record<string, unknown>,
  transferId: string,
  sharedInfra: IntegrationHubSharedInfra,
): Promise<TenantResolution> {
  const headerTenantId = firstTrimmed(headers["x-tenant-id"], headers["X-Tenant-Id"]);
  if (headerTenantId) {
    const hipId = firstTrimmed(headers["x-hip-id"], headers["X-HIP-ID"]);
    if (hipId) {
      const byHip = await sharedInfra.profiles.findActiveByHipId(hipId);
      if (byHip?.iqTenantId === headerTenantId) {
        return { ok: true, iqTenantId: headerTenantId, profile: byHip };
      }
    }
    return { ok: true, iqTenantId: headerTenantId };
  }

  const row = await sharedInfra.m3DataTransfers.findByTransferId(transferId);
  if (row) {
    return { ok: true, iqTenantId: row.iqTenantId };
  }

  try {
    const resolved = await resolveCallbackTenant(headers, sharedInfra.profiles);
    return { ok: true, iqTenantId: resolved.iqTenantId, profile: resolved.profile };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "tenant resolution failed" };
  }
}

/** Derives the idempotency request-id for a bundle push from headers/body. */
function resolveBundlePushRequestId(
  headers: Record<string, unknown>,
  body: unknown,
): string {
  try {
    return resolveInboundRequestId(headers, body);
  } catch {
    return firstTrimmed(headers["request-id"], headers["REQUEST-ID"]);
  }
}

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
            ...(ctx.body as OnConsentInitCallback),
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
            ...(ctx.body as ConsentNotifyCallback),
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
            ...(ctx.body as OnConsentFetchCallback),
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
            ...(ctx.body as OnHiuDataRequestCallback),
          },
          ctx.deps,
        );
      },
    });
  });

  /**
   * Encrypted bundle push from CM/HIP — `transferId` is in the URL.
   * Tenant: `x-tenant-id` header, else `integration_hub.abdm_m3_data_transfers` row
   * (CM often omits tenant headers), else HIP/header resolution via {@link resolveCallbackTenant}.
   */
  app.post("/hiu/health-information/transfer/:transferId", async (req, reply) => {
    const headers = req.headers as Record<string, unknown>;
    const transferId = (req.params as { transferId: string }).transferId;

    const tenant = await resolveBundlePushTenant(headers, transferId, sharedInfra);
    if (!tenant.ok) {
      return reply.code(400).send({ error: "BadRequest", message: tenant.message });
    }
    const { iqTenantId, profile } = tenant;

    let deps;
    try {
      deps = (await buildAbdmDepsForTenant(iqTenantId, sharedInfra, { profile })).deps;
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

    const pushRequestId = resolveBundlePushRequestId(headers, req.body);
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
