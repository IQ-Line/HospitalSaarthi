import { ABDM_ERROR_CODES } from "@hims/ts-sdk-abha";
import type { DiscoveryRequest, OnDiscoverRequest } from "@hims/ts-sdk-abha/protocol/m2/index.js";
import type { AbdmTenantInput, AbdmAdapterDeps } from "../../../ports.js";
import { M2_GATEWAY_PATHS } from "../../../lib/m2-gateway-paths.js";
import { resolveUnifiedLinkHiType } from "../../../lib/m2-link-hi-type.js";

export async function handleDiscoverCallback(
  input: AbdmTenantInput<DiscoveryRequest & { inboundRequestId: string }>,
  deps: AbdmAdapterDeps,
): Promise<void> {
  const abhaAddress =
    input.patient[0]?.id ??
    input.patient[0]?.verifiedIdentifiers?.find((i) => i.type === "ABHA")?.value;

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

  let patient = abhaAddress
    ? await deps.empi.findPatientByAbhaAddress({
        iqTenantId: input.iqTenantId,
        abhaAddress,
      })
    : null;

  if (!patient && input.patient[0]?.verifiedIdentifiers?.length) {
    const match = await deps.empi.findPatientByDemographics({
      iqTenantId: input.iqTenantId,
      identifiers: input.patient[0].verifiedIdentifiers.map((i) => ({
        type: i.type,
        value: i.value,
      })),
    });
    if (match) {
      patient = {
        patientId: match.patientId,
        demographics: {},
      };
    }
  }

  if (!patient) {
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
    contextMerge: { patientId: patient.patientId, abhaAddress },
  });

  const contexts = await deps.recordFoundation.listUnlinkedCareContexts({
    iqTenantId: input.iqTenantId,
    patientId: patient.patientId,
  });

  const patientPayload =
    contexts.length > 0
      ? [
          {
            referenceNumber: patient.patientId,
            display: abhaAddress ?? patient.patientId,
            careContexts: contexts.map((c) => ({
              referenceNumber: c.referenceNumber,
              display: c.display,
            })),
            hiType: resolveUnifiedLinkHiType(contexts),
            count: contexts.length,
          },
        ]
      : [];

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
      })),
    },
  });
}
