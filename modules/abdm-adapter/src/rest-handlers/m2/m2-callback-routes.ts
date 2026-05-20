import type { FastifyInstance } from "fastify";
import type { AbdmAdapterDeps } from "../../ports.js";
import { runInboundCallback } from "./m2-inbound-helper.js";
import { handleTokenCallback } from "../../use-cases/m2/link-token/handle-token-callback.js";
import { handleHipLinkCallback } from "../../use-cases/m2/hip-initiated-link/handle-link-callback.js";
import { handleDiscoverCallback } from "../../use-cases/m2/user-initiated-link/handle-discover-callback.js";
import { handleLinkInitCallback } from "../../use-cases/m2/user-initiated-link/handle-link-init-callback.js";
import { handleLinkConfirmCallback } from "../../use-cases/m2/user-initiated-link/handle-link-confirm-callback.js";
import { handleConsentNotifyCallback } from "../../use-cases/m2/consent-notify/handle-consent-notify-callback.js";
import { handleAddContextsCallback } from "../../use-cases/m2/add-contexts/handle-callback.js";
import { handleSmsNotifyCallback } from "../../use-cases/m2/sms-notify/handle-callback.js";
import { handleHipHiRequestCallback } from "../../use-cases/m3/hip/handle-hi-request-callback.js";
import { abdmWarn } from "../../lib/abdm-adapter-log.js";
import { resolveAbhaAddressFromTokenCallback } from "../../lib/resolve-token-callback-abha.js";
import type { OnGenerateTokenSuccessCallback } from "@hims/ts-sdk-abha/protocol/m2/index.js";
import type { OnLinkCareContextCallback } from "@hims/ts-sdk-abha/protocol/m2/index.js";
import type { DiscoveryRequest } from "@hims/ts-sdk-abha/protocol/m2/index.js";
import type { LinkInitRequest } from "@hims/ts-sdk-abha/protocol/m2/index.js";
import type { LinkConfirmRequest } from "@hims/ts-sdk-abha/protocol/m2/index.js";
import type { ConsentNotifyRequest } from "@hims/ts-sdk-abha/protocol/m2/index.js";
import type { OnAddContextsCallback } from "@hims/ts-sdk-abha/protocol/m2/index.js";
import type { OnSmsNotifyCallback } from "@hims/ts-sdk-abha/protocol/m2/index.js";
import type { HipHealthInformationRequest } from "@hims/ts-sdk-abha/protocol/m3/hip-data-transfer.js";

/** Gateway callback routes — mounted at `/api/v3` (no `/api/abdm/v1` prefix). */
export async function registerM2CallbackRoutes(
  app: FastifyInstance,
  deps: AbdmAdapterDeps,
): Promise<void> {
  app.post("/hip/token/on-generate-token", async (req, reply) => {
    await runInboundCallback({
      req,
      reply,
      flowKind: "abdm.m2.link-token",
      httpStatus: 202,
      deps,
      handler: async ({ iqTenantId, body }) => {
        const payload = body as OnGenerateTokenSuccessCallback & {
          abhaAddress?: string;
          abha_address?: string;
        };
        const abhaAddress = resolveAbhaAddressFromTokenCallback(payload);
        if (!abhaAddress) {
          abdmWarn("abdm.m2.link_token.callback_skipped", {
            reason: "missing_abha_address",
            requestId: payload.response?.requestId,
          });
          return;
        }
        await handleTokenCallback(
          { iqTenantId, abhaAddress, ...payload },
          deps,
        );
      },
    });
  });

  app.post("/link/on_carecontext", async (req, reply) => {
    await runInboundCallback({
      req,
      reply,
      flowKind: "abdm.m2.hip-initiated-link.v1",
      httpStatus: 202,
      deps,
      handler: async ({ iqTenantId, requestId, body }) => {
        const payload = body as OnLinkCareContextCallback & { abhaAddress?: string };
        const gatewayRequestId =
          payload.response?.requestId ?? requestId;
        await handleHipLinkCallback(
          {
            iqTenantId,
            gatewayRequestId,
            abhaAddress: payload.abhaAddress ?? "",
            ...payload,
          },
          deps,
        );
      },
    });
  });

  app.post("/hip/patient/care-context/discover", async (req, reply) => {
    await runInboundCallback({
      req,
      reply,
      flowKind: "abdm.m2.user-initiated-link.v1",
      httpStatus: 200,
      deps,
      handler: async ({ iqTenantId, requestId, body }) => {
        await handleDiscoverCallback(
          {
            iqTenantId,
            inboundRequestId: requestId,
            ...(body as DiscoveryRequest),
          },
          deps,
        );
      },
    });
  });

  app.post("/hip/link/care-context/init", async (req, reply) => {
    await runInboundCallback({
      req,
      reply,
      flowKind: "abdm.m2.user-initiated-link.v1",
      httpStatus: 200,
      deps,
      handler: async ({ iqTenantId, requestId, body }) => {
        await handleLinkInitCallback(
          {
            iqTenantId,
            inboundRequestId: requestId,
            ...(body as LinkInitRequest),
          },
          deps,
        );
      },
    });
  });

  app.post("/hip/link/care-context/confirm", async (req, reply) => {
    await runInboundCallback({
      req,
      reply,
      flowKind: "abdm.m2.user-initiated-link.v1",
      httpStatus: 202,
      deps,
      handler: async ({ iqTenantId, requestId, body }) => {
        await handleLinkConfirmCallback(
          {
            iqTenantId,
            inboundRequestId: requestId,
            ...(body as LinkConfirmRequest),
          },
          deps,
        );
      },
    });
  });

  app.post("/links/context/on-notify", async (req, reply) => {
    await runInboundCallback({
      req,
      reply,
      flowKind: "abdm.m2.add-contexts.v1",
      httpStatus: 202,
      deps,
      handler: async ({ iqTenantId, requestId, body }) => {
        const payload = body as OnAddContextsCallback;
        const gatewayRequestId = payload.response?.requestId ?? requestId;
        await handleAddContextsCallback(
          { iqTenantId, gatewayRequestId, ...payload },
          deps,
        );
      },
    });
  });

  app.post("/patients/sms/on-notify", async (req, reply) => {
    await runInboundCallback({
      req,
      reply,
      flowKind: "abdm.m2.sms-notify.v1",
      httpStatus: 202,
      deps,
      handler: async ({ iqTenantId, requestId, body }) => {
        const payload = body as OnSmsNotifyCallback;
        const gatewayRequestId = payload.resp?.requestId ?? requestId;
        await handleSmsNotifyCallback(
          { iqTenantId, gatewayRequestId, ...payload },
          deps,
        );
      },
    });
  });

  app.post("/consent/request/hip/notify", async (req, reply) => {
    await runInboundCallback({
      req,
      reply,
      flowKind: "abdm.m2.consent-notify.v1",
      httpStatus: 202,
      deps,
      handler: async ({ iqTenantId, requestId, body }) => {
        await handleConsentNotifyCallback(
          {
            iqTenantId,
            inboundRequestId: requestId,
            ...(body as ConsentNotifyRequest),
          },
          deps,
        );
      },
    });
  });

  app.post("/hip/health-information/request", async (req, reply) => {
    await runInboundCallback({
      req,
      reply,
      flowKind: "abdm.m3.hip.v1",
      httpStatus: 202,
      deps,
      handler: async ({ iqTenantId, requestId, body }) => {
        await handleHipHiRequestCallback(
          {
            iqTenantId,
            inboundRequestId: requestId,
            ...(body as HipHealthInformationRequest),
          },
          deps,
        );
      },
    });
  });
}
