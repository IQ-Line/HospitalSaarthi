import { ABDM_ERROR_CODES } from "@hims/ts-sdk-abha";
import type { OnConsentFetchCallback } from "@hims/ts-sdk-abha/protocol/m3/hiu-consent-request.js";
import type { AbdmTenantInput, AbdmAdapterDeps } from "../../../ports.js";
import { verifyM3ConsentArtefactSignature } from "../../../lib/m3-consent-artefact-signature.js";
import { resolveConsentPatientId } from "../../../lib/resolve-consent-patient-id.js";
import { createConsentGrantedEnvelope } from "../../../lib/abdm-envelope.js";
import { assertFlowKind } from "../../../domain/session.js";
import { M3Hiu } from "../../../lib/m3-fsm-states.js";
import { ensureDataRequestForConsent } from "./start-data-request.js";
import type { M3HiuContext } from "./context.js";
import { abdmWarn } from "../../../lib/abdm-adapter-log.js";

export async function handleOnFetchCallback(
  input: AbdmTenantInput<OnConsentFetchCallback & { inboundRequestId: string }>,
  deps: AbdmAdapterDeps,
): Promise<void> {
  const detail = input.consent?.consentDetail;
  if (!detail?.consentId) return;

  const consentId = detail.consentId;
  const pendingRow = await resolveConsentRequestForArtefact(
    deps,
    input.iqTenantId,
    consentId,
  );
  if (!pendingRow) return;

  const consentRequestId = pendingRow.consentRequestId;

  const signatureValid = await verifyM3ConsentArtefactSignature({
    consentDetail: detail as Record<string, unknown>,
    signature: input.consent.signature,
    consentId,
  });

  if (!signatureValid) {
    await deps.sessions.patch({
      iqTenantId: input.iqTenantId,
      sessionId: pendingRow.sessionId,
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
      consentRequestId,
      state: M3Hiu.CONSENT_DENIED,
    });
    return;
  }

  const abhaAddress = detail.patient.id;
  let patientId: string;
  try {
    patientId = await resolveConsentPatientId({
      iqTenantId: input.iqTenantId,
      abhaAddress,
      empi: deps.empi,
      registration: deps.registration,
    });
  } catch {
    patientId = "00000000-0000-0000-0000-000000000099";
  }

  await deps.m3ConsentArtefactsHiu.upsert({
    iqTenantId: input.iqTenantId,
    consentId,
    consentRequestId,
    patientAbhaAddress: abhaAddress,
    hipId: detail.hip.id,
    status: input.consent.status,
    dataEraseAt: new Date(detail.permission.dataEraseAt),
    grantedAt: new Date(detail.createdAt),
    hiTypes: detail.hiTypes,
    careContexts: detail.careContexts,
    artefactJson: input.consent as unknown as Record<string, unknown>,
    signature: input.consent.signature,
    signatureValid,
  });

  await deps.consentArtefacts.upsert({
    iqTenantId: input.iqTenantId,
    consentId,
    patientId,
    hipId: detail.hip.id,
    hiuId: detail.hiu?.id ?? deps.xHiuId,
    status: input.consent.status,
    dataEraseAt: new Date(detail.permission.dataEraseAt),
    grantedAt: new Date(detail.createdAt),
    artefactJson: input.consent as unknown as Record<string, unknown>,
    signature: input.consent.signature,
    signatureValid,
  });

  const session = await deps.sessions.findById({
    iqTenantId: input.iqTenantId,
    sessionId: pendingRow.sessionId,
  });
  if (!session) return;
  assertFlowKind(session, "abdm.m3.hiu.v1");

  const ctx = session.context as M3HiuContext;
  const pendingList = ctx.pendingArtefactIds ?? [];
  const fetched = [...new Set([...(ctx.fetchedArtefactIds ?? []), consentId])];
  const stillPending = pendingList.filter((id) => !fetched.includes(id));
  const mergedIds = [...new Set([...(ctx.consentArtefactIds ?? []), consentId])];
  const allDone = stillPending.length === 0 && fetched.length > 0;

  await deps.sessions.patch({
    iqTenantId: input.iqTenantId,
    sessionId: pendingRow.sessionId,
    contextMerge: {
      fetchedArtefactIds: fetched,
      pendingArtefactIds: stillPending,
      consentArtefactIds: mergedIds,
      consentId,
    },
    ...(allDone ? { state: M3Hiu.CONSENT_GRANTED } : {}),
  });

  if (allDone) {
    await finalizeConsentGranted(deps, {
      iqTenantId: input.iqTenantId,
      consentRequestId,
      consentArtefactIds: mergedIds,
      consentId,
      patientId,
      dataEraseAt: detail.permission.dataEraseAt,
    });
  }

  if (input.consent.status === "GRANTED") {
    try {
      await ensureDataRequestForConsent(
        { iqTenantId: input.iqTenantId, consentId },
        deps,
      );
    } catch (e) {
      abdmWarn("abdm.m3.hiu_auto_data_request_failed", {
        consentId,
        message: e instanceof Error ? e.message : String(e),
      });
    }
  }
}

async function finalizeConsentGranted(
  deps: AbdmAdapterDeps,
  params: {
    iqTenantId: string;
    consentRequestId: string;
    consentArtefactIds: string[];
    consentId: string;
    patientId: string;
    dataEraseAt: string;
  },
): Promise<void> {
  await deps.m3ConsentRequests.patch({
    iqTenantId: params.iqTenantId,
    consentRequestId: params.consentRequestId,
    state: M3Hiu.CONSENT_GRANTED,
    consentArtefactIds: params.consentArtefactIds,
  });
  if (deps.eventBus) {
    await deps.eventBus.publish(
      createConsentGrantedEnvelope(params.iqTenantId, {
        consentId: params.consentId,
        patientId: params.patientId,
        dataEraseAt: params.dataEraseAt,
      }),
    );
  }
}

async function resolveConsentRequestForArtefact(
  deps: AbdmAdapterDeps,
  iqTenantId: string,
  consentId: string,
) {
  const existing = await deps.m3ConsentArtefactsHiu.findById(iqTenantId, consentId);
  if (existing) {
    return deps.m3ConsentRequests.findByConsentRequestId({
      iqTenantId,
      consentRequestId: existing.consentRequestId,
    });
  }

  const active = await deps.m3ConsentRequests.listActive(iqTenantId);
  for (const row of active) {
    const session = await deps.sessions.findById({
      iqTenantId,
      sessionId: row.sessionId,
    });
    const pending = (session?.context as M3HiuContext)?.pendingArtefactIds ?? [];
    if (pending.includes(consentId)) return row;
  }
  return null;
}
