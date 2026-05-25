import type { ConsentNotifyCallback } from "@hims/ts-sdk-abha/protocol/m3/hiu-consent-request.js";
import type { OnConsentNotifyAckBody } from "@hims/ts-sdk-abha/protocol/m3/hiu-consent-request.js";
import type { AbdmTenantInput, AbdmAdapterDeps } from "../../../ports.js";
import { M3_GATEWAY_PATHS } from "../../../lib/m3-gateway-paths.js";
import { skipM3OutboundGateway } from "../../../lib/m3-runtime-env.js";
import { fetchConsentArtefact } from "./fetch-artefact.js";
import { resolveM3ConsentRequestRow } from "./resolve-m3-consent-row.js";

export async function handleNotifyCallback(
  input: AbdmTenantInput<ConsentNotifyCallback & { inboundRequestId: string }>,
  deps: AbdmAdapterDeps,
): Promise<void> {
  const { notification } = input;
  const consentRequestId = notification.consentRequestId;

  const row = await resolveM3ConsentRequestRow(deps, input.iqTenantId, {
    cmConsentRequestId: consentRequestId,
  });
  if (!row) return;

  if (notification.status === "DENIED" || notification.status === "REVOKED") {
    await deps.sessions.patch({
      iqTenantId: input.iqTenantId,
      sessionId: row.sessionId,
      state: "CONSENT_DENIED",
      contextMerge: {
        error: {
          code: notification.status,
          message: notification.reason ?? notification.status,
        },
      },
    });
    await deps.m3ConsentRequests.patch({
      iqTenantId: input.iqTenantId,
      consentRequestId: row.consentRequestId,
      state: "CONSENT_DENIED",
    });
    return;
  }

  const artefactIds =
    notification.consentArtefacts?.map((a) => a.id).filter(Boolean) ?? [];

  const ackBody: OnConsentNotifyAckBody = {
    acknowledgement: artefactIds.map((id) => ({
      status: "OK" as const,
      consentId: id,
    })),
    response: { requestId: input.inboundRequestId },
  };

  if (!skipM3OutboundGateway()) {
    await deps.gateway.post({
      path: M3_GATEWAY_PATHS.consentHiuOnNotify,
      body: ackBody,
      target: "gateway",
      requestId: input.inboundRequestId,
      headers: { "X-HIU-ID": deps.xHiuId },
    });
  }

  await deps.sessions.patch({
    iqTenantId: input.iqTenantId,
    sessionId: row.sessionId,
    contextMerge: {
      pendingArtefactIds: artefactIds,
      fetchedArtefactIds: [],
    },
  });

  for (const consentId of artefactIds) {
    await fetchConsentArtefact(
      {
        iqTenantId: input.iqTenantId,
        consentId,
        consentRequestId: row.consentRequestId,
      },
      deps,
    );
  }
}
