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

async function resolveDiscoverPatient(
  deps: AbdmAdapterDeps,
  input: { iqTenantId: string; discoveryPatient: ReturnType<typeof normalizeDiscoveryPatient> },
): Promise<{ patientId: string; demographics: Record<string, unknown> } | null> {
  const { iqTenantId, discoveryPatient } = input;
  const abhaAddress = resolveDiscoveryAbhaAddress(discoveryPatient);
  console.log("Aba addressss=============>>>>>>>", abhaAddress);

  if (abhaAddress) {
    const byAbha = await deps.empi.findPatientByAbhaAddress({ iqTenantId, abhaAddress });
    console.log("By abha=============>>>>>>>", byAbha);
    if (byAbha) return byAbha;
  }

  const abhaNumber = resolveDiscoveryAbhaNumber(discoveryPatient);
  console.log("Abha number=============>>>>>>>", abhaNumber);
  if (abhaNumber) {
    const byNumber = await deps.empi.findPatientByAbhaNumber({ iqTenantId, abhaNumber });
    console.log("By number=============>>>>>>>", byNumber);
    if (byNumber) return { patientId: byNumber.patientId, demographics: {} };
  }

  const demographics = buildEmpiDemographicsFromDiscovery(discoveryPatient);
  console.log("Demographics=============>>>>>>>", demographics);
  if (demographics) {
    const match = await deps.empi.findPatientByDemographics({
      iqTenantId,
      ...demographics,
    });
    console.log("Match=============>>>>>>>", match);
    if (match) return { patientId: match.patientId, demographics: {} };
  }

  const verified = discoveryPatient?.verifiedIdentifiers;
  console.log("Verified=============>>>>>>>", verified);
  if (verified?.length) {
    const match = await deps.empi.findPatientByDemographics({
      iqTenantId,
      identifiers: verified.map((i: { type: string; value: string }) => ({
        type: i.type,
        value: i.value,
      })),
    });
    console.log("Match by verified=============>>>>>>>", match);
    if (match) return { patientId: match.patientId, demographics: {} };
  }

  return null;
}

export async function handleDiscoverCallback(
  input: AbdmTenantInput<DiscoveryRequest & { inboundRequestId: string }>,
  deps: AbdmAdapterDeps,
): Promise<void> {
  const discoveryPatient = normalizeDiscoveryPatient(input.patient);
  console.log("Discovery patient=============>>>>>>>", discoveryPatient);
  const abhaAddress = resolveDiscoveryAbhaAddress(discoveryPatient);
  console.log("Abha address=============>>>>>>>", abhaAddress);
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
  console.log("Session0001=============>>>>>>>", session);

  if (!session) {
    session = await deps.sessions.create({
      iqTenantId: input.iqTenantId,
      flowKind: "abdm.m2.user-initiated-link.v1",
      initialContext: { transactionId: input.transactionId, abhaAddress },
    });
    console.log("Session0002=============>>>>>>>", session);
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
  console.log("Patient0001=============>>>>>>>", patient);

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
    console.log("Body0001=============>>>>>>>", body);
    const response = await deps.gateway.post({
      path: M2_GATEWAY_PATHS.onDiscover,
      body,
      target: "gateway",
      requestId: input.inboundRequestId,
      xHipId: deps.xHipId,
    });
    console.log("Response0001=============>>>>>>>", response);
    const sessionResponse = await deps.sessions.patch({
      iqTenantId: input.iqTenantId,
      sessionId: session.sessionId,
      state: "NO_MATCH",
    });
    console.log("SessionResponse0001=============>>>>>>>", sessionResponse);
    return;
  }

  const sessionResponsepatch = await deps.sessions.patch({
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
  console.log("SessionResponsepatch0001=============>>>>>>>", sessionResponsepatch);

  const contexts = await listUnlinkedCareContexts(deps, {
    iqTenantId: input.iqTenantId,
    patientId: patient.patientId,
    abhaAddress,
  });
  console.log("Contexts0001=============>>>>>>>", contexts);

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
  console.log("PatientPayload0001=============>>>>>>>", patientPayload);

  const body: OnDiscoverRequest = {
    transactionId: input.transactionId,
    ...(patientPayload.length > 0 ? { patient: patientPayload } : {}),
    response: { requestId: input.inboundRequestId },
  };
  console.log("Body0002=============>>>>>>>", body);
  const response0002 = await deps.gateway.post({
    path: M2_GATEWAY_PATHS.onDiscover,
    body,
    target: "gateway",
    requestId: input.inboundRequestId,
    xHipId: deps.xHipId,
  });
  console.log("Response0002=============>>>>>>>", response0002);
  const sessionResponsepatch0002 = await deps.sessions.patch({
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
  console.log("SessionResponsepatch0002=============>>>>>>>", sessionResponsepatch0002);
}
