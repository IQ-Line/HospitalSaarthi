import { randomUUID } from "node:crypto";
import { ABDM_ERROR_CODES } from "@hims/ts-sdk-abha";
import type {
  ConsentNotifyRequest,
  OnConsentNotifyRequest,
} from "@hims/ts-sdk-abha/protocol/m2/index.js";
import type { AbdmTenantInput, AbdmAdapterDeps } from "../../../ports.js";
import { verifyAbdmSignature } from "../../../lib/abdm-signature-verifier.js";
import { M2_GATEWAY_PATHS } from "../../../lib/m2-gateway-paths.js";
import { createConsentGrantedEnvelope } from "../../../lib/abdm-envelope.js";
import { skipOutboundGatewayInDev } from "../../../lib/dev-inbound-simulation.js";

export async function handleConsentNotifyCallback(
  input: AbdmTenantInput<ConsentNotifyRequest & { inboundRequestId: string }>,
  deps: AbdmAdapterDeps,
): Promise<void> {
  const { notification } = input;
  const signatureValid = await verifyAbdmSignature({}, notification);

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

  const abhaAddress = notification.consentDetail.patient.id;
  const empiPatient = await deps.empi.findPatientByAbhaAddress({
    iqTenantId: input.iqTenantId,
    abhaAddress,
  });
  const patientId = empiPatient?.patientId ?? randomUUID();

  await deps.consentArtefacts.upsert({
    iqTenantId: input.iqTenantId,
    consentId: notification.consentId,
    patientId,
    hipId: notification.consentDetail.hip.id,
    hiuId: notification.consentDetail.hiu.id,
    status: notification.status,
    dataEraseAt: new Date(notification.consentDetail.permission.dataEraseAt),
    grantedAt: new Date(notification.consentDetail.createdAt),
    artefactJson: notification as unknown as Record<string, unknown>,
    signature: notification.signature,
    signatureValid: true,
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
