import { ABDM_ERROR_CODES } from "@hims/ts-sdk-abha";
import type { DiscoveryRequest, OnDiscoverRequest } from "@hims/ts-sdk-abha/protocol/m2";
import type { AbdmTenantInput, AbdmAdapterDeps } from "../../../ports.js";
import { M2_GATEWAY_PATHS } from "../../../lib/m2-gateway-paths.js";
import { toLinkCareContextHiType } from "../../../lib/m2-hi-type-mapper.js";
import {
  buildEmpiDemographicsFromDiscovery,
  normalizeDiscoveryPatient,
  resolveDiscoveryAbhaAddress,
  resolveDiscoveryAbhaNumber,
  resolveDiscoveryMobile,
} from "../../../lib/normalize-discovery-patient.js";
import { MIN_EMPI_DEMOGRAPHICS_MATCH_SCORE } from "../../../lib/m2-empi-match-threshold.js";
import { abdmWarn } from "../../../lib/abdm-adapter-log.js";

async function listUnlinkedCareContexts(
  deps: AbdmAdapterDeps,
  input: { iqTenantId: string; patientId: string; abhaAddress?: string },
) {
  const all = await deps.recordFoundation.listCareContexts({
    iqTenantId: input.iqTenantId,
    patientId: input.patientId,
  });
  if (!input.abhaAddress) return all;

  const linked = await deps.careContextLinkState.listLinkedReferences({
    iqTenantId: input.iqTenantId,
    abhaAddress: input.abhaAddress,
  });
  return all.filter((ctx) => !linked.has(ctx.referenceNumber));
}

function acceptDemographicsMatch(
  match: { patientId: string; score: number } | null,
): { patientId: string } | null {
  if (!match || match.score < MIN_EMPI_DEMOGRAPHICS_MATCH_SCORE) return null;
  return { patientId: match.patientId };
}

async function resolveDiscoverPatient(
  deps: AbdmAdapterDeps,
  input: { iqTenantId: string; discoveryPatient: ReturnType<typeof normalizeDiscoveryPatient> },
): Promise<{ patientId: string; demographics: Record<string, unknown> } | null> {
  const { iqTenantId, discoveryPatient } = input;
  const abhaAddress = resolveDiscoveryAbhaAddress(discoveryPatient);

  if (abhaAddress) {
    const byAbha = await deps.empi.findPatientByAbhaAddress({ iqTenantId, abhaAddress });
    if (byAbha) return byAbha;
  }

  const abhaNumber = resolveDiscoveryAbhaNumber(discoveryPatient);
  if (abhaNumber) {
    const byNumber = await deps.empi.findPatientByAbhaNumber({ iqTenantId, abhaNumber });
    if (byNumber) return { patientId: byNumber.patientId, demographics: {} };
  }

  const demographics = buildEmpiDemographicsFromDiscovery(discoveryPatient);
  if (demographics) {
    const match = await deps.empi.findPatientByDemographics({
      iqTenantId,
      ...demographics,
    });
    const accepted = acceptDemographicsMatch(match);
    if (accepted) return { patientId: accepted.patientId, demographics: {} };
    if (match) {
      abdmWarn("abdm.m2.user_link.discover_demographics_score_rejected", {
        abhaAddress,
        score: match.score,
        threshold: MIN_EMPI_DEMOGRAPHICS_MATCH_SCORE,
      });
    }
  }

  const verified = discoveryPatient?.verifiedIdentifiers;
  if (verified?.length) {
    const match = await deps.empi.findPatientByDemographics({
      iqTenantId,
      identifiers: verified.map((i: { type: string; value: string }) => ({
        type: i.type,
        value: i.value,
      })),
    });
    const accepted = acceptDemographicsMatch(match);
    if (accepted) return { patientId: accepted.patientId, demographics: {} };
    if (match) {
      abdmWarn("abdm.m2.user_link.discover_verified_id_score_rejected", {
        abhaAddress,
        score: match.score,
        threshold: MIN_EMPI_DEMOGRAPHICS_MATCH_SCORE,
      });
    }
  }

  return null;
}

export async function handleDiscoverCallback(
  input: AbdmTenantInput<DiscoveryRequest & { inboundRequestId: string }>,
  deps: AbdmAdapterDeps,
): Promise<void> {
  const discoveryPatient = normalizeDiscoveryPatient(input.patient);
  const abhaAddress = resolveDiscoveryAbhaAddress(discoveryPatient);
  if (!discoveryPatient) {
    abdmWarn("abdm.m2.user_link.discover_missing_patient", {
      transactionId: input.transactionId,
      requestId: input.inboundRequestId,
    });
  }

  let session = await deps.sessions.findUserLinkByTransactionId({
    iqTenantId: input.iqTenantId,
    transactionId: input.transactionId,
  });

  if (!session) {
    session = await deps.sessions.create({
      iqTenantId: input.iqTenantId,
      flowKind: "abdm.m2.user-initiated-link.v1",
      initialContext: { transactionId: input.transactionId, abhaAddress },
    });
    await deps.sessions.patch({
      iqTenantId: input.iqTenantId,
      sessionId: session.sessionId,
      state: "DISCOVERY_RECEIVED",
      txnId: input.transactionId,
      requestId: input.inboundRequestId,
    });
  }

  const patient = await resolveDiscoverPatient(deps, {
    iqTenantId: input.iqTenantId,
    discoveryPatient,
  });

  if (!patient) {
    abdmWarn("abdm.m2.user_link.discover_no_empi_match", {
      transactionId: input.transactionId,
      requestId: input.inboundRequestId,
      abhaAddress,
      hasDemographics: Boolean(buildEmpiDemographicsFromDiscovery(discoveryPatient)),
    });
    const body: OnDiscoverRequest = {
      transactionId: input.transactionId,
      error: {
        code: ABDM_ERROR_CODES.PATIENT_NOT_FOUND,
        message: "Patient not found",
      },
      response: { requestId: input.inboundRequestId },
    };
    await deps.gateway.post({
      path: M2_GATEWAY_PATHS.onDiscover,
      body,
      target: "gateway",
      requestId: input.inboundRequestId,
      xHipId: deps.xHipId,
    });
    await deps.sessions.patch({
      iqTenantId: input.iqTenantId,
      sessionId: session.sessionId,
      state: "NO_MATCH",
    });
    return;
  }

  await deps.sessions.patch({
    iqTenantId: input.iqTenantId,
    sessionId: session.sessionId,
    state: "PATIENT_MATCHED",
    contextMerge: {
      patientId: patient.patientId,
      abhaAddress,
      phoneNo:
        resolveDiscoveryMobile(discoveryPatient) ??
        (await deps.empi.findM2PatientProfile({
          iqTenantId: input.iqTenantId,
          patientId: patient.patientId,
        }))?.phoneNo,
    },
  });

  const contexts = await listUnlinkedCareContexts(deps, {
    iqTenantId: input.iqTenantId,
    patientId: patient.patientId,
    abhaAddress,
  });

  const display = abhaAddress ?? patient.patientId;
  const byHiType = new Map<string, typeof contexts>();
  for (const ctx of contexts) {
    const hiType = toLinkCareContextHiType(ctx.hiType ?? "OPCONSULTATION");
    const group = byHiType.get(hiType);
    if (group) group.push(ctx);
    else byHiType.set(hiType, [ctx]);
  }

  const patientPayload = Array.from(byHiType.entries()).map(([hiType, items]) => ({
    referenceNumber: patient.patientId,
    display,
    careContexts: items.map((c) => ({
      referenceNumber: c.referenceNumber,
      display: c.display,
    })),
    hiType,
    count: items.length,
  }));

  const body: OnDiscoverRequest = {
    transactionId: input.transactionId,
    ...(patientPayload.length > 0 ? { patient: patientPayload } : {}),
    response: { requestId: input.inboundRequestId },
  };
  await deps.gateway.post({
    path: M2_GATEWAY_PATHS.onDiscover,
    body,
    target: "gateway",
    requestId: input.inboundRequestId,
    xHipId: deps.xHipId,
  });
  await deps.sessions.patch({
    iqTenantId: input.iqTenantId,
    sessionId: session.sessionId,
    state: contexts.length > 0 ? "ON_DISCOVER_RESPONDED" : "NO_MATCH",
    contextMerge: {
      careContexts: contexts.map((c) => ({
        referenceNumber: c.referenceNumber,
        display: c.display,
        hiType: c.hiType,
      })),
    },
  });
}
