import { ABDM_ERROR_CODES } from "@hims/ts-sdk-abha";
import type { ConsentNotifyRequest } from "@hims/ts-sdk-abha/protocol/m2";
import type { OnConsentNotifyRequest } from "@hims/ts-sdk-abha/protocol/m2";
import type { AbdmTenantInput, AbdmAdapterDeps } from "../../../ports.js";
import { verifyM3ConsentArtefactSignature } from "../../../lib/m3-consent-artefact-signature.js";
import { resolveConsentPatientId } from "../../../lib/resolve-consent-patient-id.js";
import {
  filterConsentCareContexts,
  type ConsentArtefactWithCareContexts,
} from "../../../lib/filter-consent-care-contexts.js";
import { createConsentGrantedEnvelope } from "../../../lib/abdm-envelope.js";
import { M2_GATEWAY_PATHS } from "../../../lib/m2-gateway-paths.js";
import { skipOutboundGatewayInDev } from "../../../lib/dev-inbound-simulation.js";
import type { M3HiuContext } from "./context.js";
import { M3Hiu } from "../../../lib/m3-fsm-states.js";

/**
 * When HIU and HIP share one bridge URL, CM may send M3 patient approval to
 * `/consent/request/hip/notify` with `consentDetail.hip` but no `hiu`.
 *
 * PHR user-initiated consent has no prior `abdm_m3_consent_requests` row — bridge
 * returns false and {@link handleConsentNotifyCallback} handles it (LIMS parity).
 */
export async function handleM3HipConsentNotifyBridge(
  input: AbdmTenantInput<ConsentNotifyRequest & { inboundRequestId: string }>,
  deps: AbdmAdapterDeps,
): Promise<boolean> {
  const { notification } = input;
  if (notification.status === "REVOKED") {
    return handleM3HipConsentRevoked(input, deps);
  }
  if (notification.status !== "GRANTED") return false;

  const detail: ConsentArtefactWithCareContexts = notification.consentDetail;
  const patientAbha = detail?.patient?.id?.trim();
  const hipId = detail?.hip?.id?.trim();
  const consentId = notification.consentId?.trim();
  if (!patientAbha || !hipId || !consentId || !detail) return false;

  // Classic M2 HIP notify includes both roles — defer to M2 consent handler.
  if (detail.hiu?.id) return false;

  const active = await deps.m3ConsentRequests.listActive(input.iqTenantId);
  const forPatient = active
    .filter((r) => r.patientAbhaAddress === patientAbha)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  const row =
    forPatient.find((r) => r.hipId === hipId || r.hipId == null) ?? forPatient[0];
  if (!row) return false;

  const signatureValid = await verifyM3ConsentArtefactSignature({
    consentDetail: detail as unknown as Record<string, unknown>,
    signature: notification.signature,
    consentId,
  });
  if (!signatureValid) {
    await deps.sessions.patch({
      iqTenantId: input.iqTenantId,
      sessionId: row.sessionId,
      state: M3Hiu.CONSENT_DENIED,
      contextMerge: {
        error: {
          code: ABDM_ERROR_CODES.INVALID_SIGNATURE,
          message: "invalid-signature",
        },
      },
    });
    await deps.m3ConsentRequests.patch({
      iqTenantId: input.iqTenantId,
      consentRequestId: row.consentRequestId,
      state: M3Hiu.CONSENT_DENIED,
    });
    await sendHipOnNotifyAck(input, deps);
    return true;
  }

  const linkSession = await deps.sessions.findLatestLinkedUserLinkByAbhaAddress({
    iqTenantId: input.iqTenantId,
    abhaAddress: patientAbha,
  });
  const linkCtx = linkSession?.context as { patientId?: string } | undefined;

  let patientId: string;
  try {
    patientId = await resolveConsentPatientId({
      iqTenantId: input.iqTenantId,
      abhaAddress: patientAbha,
      empi: deps.empi,
      registration: deps.registration,
      careContexts: detail.careContexts,
      userLinkPatientId: linkCtx?.patientId,
    });
  } catch {
    patientId = "00000000-0000-0000-0000-000000000099";
  }

  const hiTypes = Array.isArray(detail.hiTypes) ? detail.hiTypes : row.hiTypes;
  const filteredCareContexts = filterConsentCareContexts({
    hiTypes,
    careContexts: detail.careContexts,
  });
  const persistedConsentDetail = {
    ...detail,
    careContexts: filteredCareContexts,
  };
  const persistedNotification = {
    ...notification,
    consentDetail: persistedConsentDetail,
  };

  await deps.m3ConsentArtefactsHiu.upsert({
    iqTenantId: input.iqTenantId,
    consentId,
    consentRequestId: row.consentRequestId,
    patientAbhaAddress: patientAbha,
    hipId,
    status: "GRANTED",
    dataEraseAt: new Date(detail.permission.dataEraseAt),
    grantedAt: new Date(detail.createdAt),
    hiTypes,
    careContexts: filteredCareContexts,
    artefactJson: {
      consentDetail: persistedConsentDetail,
      signature: notification.signature,
    },
    signature: notification.signature,
    signatureValid,
    receivedAt: new Date(),
  });

  await deps.consentArtefacts.upsert({
    iqTenantId: input.iqTenantId,
    consentId,
    patientId,
    hipId,
    hiuId: deps.xHiuId,
    status: "GRANTED",
    dataEraseAt: new Date(detail.permission.dataEraseAt),
    grantedAt: new Date(detail.createdAt),
    artefactJson: persistedNotification as unknown as Record<string, unknown>,
    signature: notification.signature,
    signatureValid,
  });

  const artefactIds = [consentId];
  await deps.sessions.patch({
    iqTenantId: input.iqTenantId,
    sessionId: row.sessionId,
    state: M3Hiu.CONSENT_GRANTED,
    contextMerge: {
      consentRequestId: row.consentRequestId,
      consentId,
      consentArtefactIds: artefactIds,
      pendingArtefactIds: [],
      fetchedArtefactIds: artefactIds,
    } satisfies Partial<M3HiuContext>,
  });
  await deps.m3ConsentRequests.patch({
    iqTenantId: input.iqTenantId,
    consentRequestId: row.consentRequestId,
    state: M3Hiu.CONSENT_GRANTED,
    consentArtefactIds: artefactIds,
  });

  await sendHipOnNotifyAck(input, deps);
  if (deps.eventBus) {
    await deps.eventBus.publish(
      createConsentGrantedEnvelope(input.iqTenantId, {
        consentId,
        patientId,
        dataEraseAt: detail.permission.dataEraseAt,
      }),
    );
  }

  return true;
}

/** Revoke payload is often `{ status, consentId }` only — no `consentDetail`. */
async function handleM3HipConsentRevoked(
  input: AbdmTenantInput<ConsentNotifyRequest & { inboundRequestId: string }>,
  deps: AbdmAdapterDeps,
): Promise<boolean> {
  const consentId = input.notification.consentId?.trim();
  if (!consentId) return false;

  const artefact = await deps.m3ConsentArtefactsHiu.findById(
    input.iqTenantId,
    consentId,
  );
  if (!artefact) return false;

  const row = await deps.m3ConsentRequests.findByConsentRequestId({
    iqTenantId: input.iqTenantId,
    consentRequestId: artefact.consentRequestId,
  });
  if (!row) return false;

  await deps.m3ConsentArtefactsHiu.upsert({
    ...artefact,
    status: "REVOKED",
  });

  await deps.sessions.patch({
    iqTenantId: input.iqTenantId,
    sessionId: row.sessionId,
    state: M3Hiu.CONSENT_DENIED,
    contextMerge: {
      consentId,
      error: { code: "REVOKED", message: "Consent revoked by patient" },
    },
  });
  await deps.m3ConsentRequests.patch({
    iqTenantId: input.iqTenantId,
    consentRequestId: row.consentRequestId,
    state: M3Hiu.CONSENT_DENIED,
  });
  await sendHipOnNotifyAck(input, deps);
  return true;
}

async function sendHipOnNotifyAck(
  input: AbdmTenantInput<ConsentNotifyRequest & { inboundRequestId: string }>,
  deps: AbdmAdapterDeps,
): Promise<void> {
  const ackBody: OnConsentNotifyRequest = {
    acknowledgement: { status: "OK", consentId: input.notification.consentId },
    response: { requestId: input.inboundRequestId },
  };
  if (!skipOutboundGatewayInDev()) {
    await deps.gateway.post({
      path: M2_GATEWAY_PATHS.consentOnNotify,
      body: ackBody,
      target: "gateway",
      requestId: input.inboundRequestId,
      xHipId: deps.xHipId,
    });
  }
}
