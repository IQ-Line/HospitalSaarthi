import { ABDM_ERROR_CODES } from "@hims/ts-sdk-abha";
import { AbdmUseCaseError } from "../../../lib/m1-errors.js";
import { resolveConsentPatientId } from "../../../lib/resolve-consent-patient-id.js";
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

  const abhaAddress = notification.consentDetail.patient.id;
  let patientId: string;
  try {
    patientId = await resolveConsentPatientId({
      iqTenantId: input.iqTenantId,
      abhaAddress,
      empi: deps.empi,
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

  await deps.consentArtefacts.upsert({
    iqTenantId: input.iqTenantId,
    consentId: notification.consentId,
    patientId,
    hipId: notification.consentDetail.hip.id,
    hiuId: notification.consentDetail.hiu?.id ?? deps.xHiuId,
    status: notification.status,
    dataEraseAt: new Date(notification.consentDetail.permission.dataEraseAt),
    grantedAt: new Date(notification.consentDetail.createdAt),
    artefactJson: notification as unknown as Record<string, unknown>,
    signature: notification.signature,
    signatureValid,
  });

  await deps.sessions.patch({
    iqTenantId: input.iqTenantId,
    sessionId: session.sessionId,
    state: "CONSENT_PERSISTED",
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
        dataEraseAt: notification.consentDetail.permission.dataEraseAt,
      }),
    );
  }
}
