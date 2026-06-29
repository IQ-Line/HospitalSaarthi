import { ABDM_ERROR_CODES } from "@hims/ts-sdk-abha";
import { AbdmUseCaseError } from "../../../lib/m1-errors.js";
import { resolveConsentPatientId } from "../../../lib/resolve-consent-patient-id.js";
import { filterConsentCareContexts } from "../../../lib/filter-consent-care-contexts.js";
import { abdmWarn } from "../../../lib/abdm-adapter-log.js";
import type {
  ConsentNotifyRequest,
  OnConsentNotifyRequest,
} from "@hims/ts-sdk-abha/protocol/m2/index.js";
import type { AbdmTenantInput, AbdmAdapterDeps } from "../../../ports.js";
import { verifyConsentNotificationSignature } from "../../../lib/consent-signature-verifier.js";
import { M2_GATEWAY_PATHS } from "../../../lib/m2-gateway-paths.js";
import { createConsentGrantedEnvelope } from "../../../lib/abdm-envelope.js";
import { skipOutboundGatewayInDev } from "../../../lib/dev-inbound-simulation.js";

export async function handleConsentNotifyCallback(
  input: AbdmTenantInput<ConsentNotifyRequest & { inboundRequestId: string }>,
  deps: AbdmAdapterDeps,
): Promise<void> {
  const { notification } = input;
  const signatureValid = await verifyConsentNotificationSignature(notification);

  const session = await deps.sessions.create({
    iqTenantId: input.iqTenantId,
    flowKind: "abdm.m2.consent-notify.v1",
    initialContext: {
      consentId: notification.consentId,
      requestId: input.inboundRequestId,
    },
  });

  await deps.sessions.patch({
    iqTenantId: input.iqTenantId,
    sessionId: session.sessionId,
    state: "CONSENT_NOTIFIED",
  });

  if (!signatureValid) {
    await deps.sessions.patch({
      iqTenantId: input.iqTenantId,
      sessionId: session.sessionId,
      state: "FAILED",
      contextMerge: {
        error: {
          code: ABDM_ERROR_CODES.INVALID_SIGNATURE,
          message: "invalid-signature",
        },
      },
    });
    return;
  }

  if (!notification.consentDetail) {
    await deps.sessions.patch({
      iqTenantId: input.iqTenantId,
      sessionId: session.sessionId,
      state: "ACKED",
      contextMerge: { consentId: notification.consentId, status: notification.status },
    });
    const ackBody: OnConsentNotifyRequest = {
      acknowledgement: { status: "OK", consentId: notification.consentId },
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
    return;
  }

  const detail = notification.consentDetail;
  const abhaAddress = detail.patient.id;
  const requestedHiTypes = Array.isArray(detail.hiTypes) ? detail.hiTypes : [];
  const filteredCareContexts = filterConsentCareContexts({
    hiTypes: requestedHiTypes,
    careContexts: detail.careContexts,
  });

  if (notification.status === "GRANTED" && filteredCareContexts.length === 0) {
    abdmWarn("abdm.m2.consent.no_supported_care_contexts", {
      abhaAddress,
      consentId: notification.consentId,
      requestId: input.inboundRequestId,
      requestedHiTypes,
    });
    await deps.sessions.patch({
      iqTenantId: input.iqTenantId,
      sessionId: session.sessionId,
      state: "FAILED",
      contextMerge: {
        error: {
          code: "NO_SUPPORTED_CARE_CONTEXTS",
          message: "Consent grants no supported care contexts for this HIP",
        },
      },
    });
    return;
  }

  const linkSession = await deps.sessions.findLatestLinkedUserLinkByAbhaAddress({
    iqTenantId: input.iqTenantId,
    abhaAddress,
  });
  const linkCtx = linkSession?.context as { patientId?: string } | undefined;

  let patientId: string;
  try {
    patientId = await resolveConsentPatientId({
      iqTenantId: input.iqTenantId,
      abhaAddress,
      empi: deps.empi,
      registration: deps.registration,
      careContexts: detail.careContexts,
      userLinkPatientId: linkCtx?.patientId,
    });
  } catch (e) {
    const message =
      e instanceof AbdmUseCaseError
        ? e.message
        : "EMPI patient resolution failed";
    abdmWarn("abdm.m2.consent.patient_unresolved", {
      abhaAddress,
      consentId: notification.consentId,
      requestId: input.inboundRequestId,
      reason: message,
    });
    await deps.sessions.patch({
      iqTenantId: input.iqTenantId,
      sessionId: session.sessionId,
      state: "FAILED",
      contextMerge: {
        error: {
          code:
            e instanceof AbdmUseCaseError ? e.clientCode : "PATIENT_NOT_FOUND",
          message,
        },
      },
    });
    return;
  }

  const persistedNotification = {
    ...notification,
    consentDetail: {
      ...detail,
      careContexts: filteredCareContexts,
    },
  };

  await deps.consentArtefacts.upsert({
    iqTenantId: input.iqTenantId,
    consentId: notification.consentId,
    patientId,
    hipId: detail.hip.id,
    hiuId: detail.hiu?.id ?? deps.xHiuId,
    status: notification.status,
    dataEraseAt: new Date(detail.permission.dataEraseAt),
    grantedAt: new Date(detail.createdAt),
    artefactJson: persistedNotification as unknown as Record<string, unknown>,
    signature: notification.signature,
    signatureValid,
  });

  await deps.sessions.patch({
    iqTenantId: input.iqTenantId,
    sessionId: session.sessionId,
    state: "CONSENT_PERSISTED",
    contextMerge: {
      consentId: notification.consentId,
      abhaAddress,
      hiuRequestMetaData: filteredCareContexts,
      careContexts: filteredCareContexts,
      requestedHiTypes,
      status: notification.status,
      patientId,
      userLinkSessionId: linkSession?.sessionId,
    },
  });

  const ackBody: OnConsentNotifyRequest = {
    acknowledgement: { status: "OK", consentId: notification.consentId },
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

  await deps.sessions.patch({
    iqTenantId: input.iqTenantId,
    sessionId: session.sessionId,
    state: "ACKED",
  });

  if (deps.eventBus) {
    await deps.eventBus.publish(
      createConsentGrantedEnvelope(input.iqTenantId, {
        consentId: notification.consentId,
        patientId,
        dataEraseAt: detail.permission.dataEraseAt,
      }),
    );
  }
}
