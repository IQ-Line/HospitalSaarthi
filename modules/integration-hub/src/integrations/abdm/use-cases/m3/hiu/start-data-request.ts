import { randomUUID } from "node:crypto";
import type { HiuDataRequestInitBody } from "@hims/ts-sdk-abha/protocol/m3/hiu-data-fetch.js";
import type { AbdmTenantInput, AbdmAdapterDeps } from "../../../ports.js";
import { M3_GATEWAY_PATHS } from "../../../lib/m3-gateway-paths.js";
import {
  m3AdapterPublicBaseUrl,
  skipM3OutboundGateway,
} from "../../../lib/m3-runtime-env.js";
import { assertFlowKind } from "../../../domain/session.js";
import { M3Hiu } from "../../../lib/m3-fsm-states.js";
import { abdmWarn } from "../../../lib/abdm-adapter-log.js";

export interface StartDataRequestInput {
  consentId: string;
}

export interface StartDataRequestResult {
  transferId: string;
  state: string;
}

const IN_FLIGHT_TRANSFER_STATES = new Set<string>([
  M3Hiu.DATA_REQUESTED,
  M3Hiu.AWAITING_PUSH,
  M3Hiu.BUNDLES_RECEIVED,
  M3Hiu.BUNDLES_DECRYPTED,
  M3Hiu.RECORDS_INGESTED,
]);

function transferHasBundle(bundleJson: Record<string, unknown> | null | undefined): boolean {
  if (!bundleJson || typeof bundleJson !== "object") return false;
  const entries = bundleJson["entries"];
  return Array.isArray(entries) && entries.length > 0;
}

/** Legacy parity: auto-request HIP data when consent artefact is granted (callbackService). */
export async function ensureDataRequestForConsent(
  input: AbdmTenantInput<{ consentId: string }>,
  deps: AbdmAdapterDeps,
): Promise<StartDataRequestResult | null> {
  const artefact = await deps.m3ConsentArtefactsHiu.findById(
    input.iqTenantId,
    input.consentId,
  );
  if (!artefact || artefact.status !== "GRANTED") return null;

  const existing = await deps.m3DataTransfers.findLatestByConsentId(
    input.iqTenantId,
    input.consentId,
  );
  if (existing && transferHasBundle(existing.bundleJson)) return null;
  if (existing && IN_FLIGHT_TRANSFER_STATES.has(existing.state)) return null;

  return startDataRequest(input, deps, { skipSessionStateCheck: true });
}

export async function startDataRequest(
  input: AbdmTenantInput<StartDataRequestInput>,
  deps: AbdmAdapterDeps,
  options?: { skipSessionStateCheck?: boolean },
): Promise<StartDataRequestResult> {
  const artefact = await deps.m3ConsentArtefactsHiu.findById(
    input.iqTenantId,
    input.consentId,
  );
  if (!artefact) {
    throw new Error("Consent artefact not found");
  }

  const consentRow = await deps.m3ConsentRequests.findByConsentRequestId({
    iqTenantId: input.iqTenantId,
    consentRequestId: artefact.consentRequestId,
  });
  if (!consentRow) {
    throw new Error("Consent request not found");
  }
  if (
    !options?.skipSessionStateCheck &&
    consentRow.state !== M3Hiu.CONSENT_GRANTED
  ) {
    throw new Error("Consent not in GRANTED state");
  }

  const session = await deps.sessions.findById({
    iqTenantId: input.iqTenantId,
    sessionId: consentRow.sessionId,
  });
  if (!session) {
    throw new Error("Session not found");
  }
  assertFlowKind(session, "abdm.m3.hiu.v1");
  if (
    !options?.skipSessionStateCheck &&
    session.state !== M3Hiu.CONSENT_GRANTED
  ) {
    throw new Error("Session not ready for data request");
  }

  const keyMaterial = await deps.fidelius.generateOurKeyMaterial();
  const encryptedPrivate = deps.payloadEncryptor.encrypt(keyMaterial.ourPrivateKey);

  const transferId = randomUUID();
  const outboundRequestId = transferId;
  const dataPushUrl = `${m3AdapterPublicBaseUrl()}/api/v3/hiu/health-information/transfer/${transferId}`;

  const permissionRange = {
    from: consentRow.permissionDateFrom.toISOString(),
    to: consentRow.permissionDateTo.toISOString(),
  };

  const initBody: HiuDataRequestInitBody = {
    hiRequest: {
      consent: { id: input.consentId },
      dateRange: permissionRange,
      dataPushUrl,
      keyMaterial: {
        cryptoAlg: "ECDH",
        curve: "Curve25519",
        dhPublicKey: {
          expiry: new Date(Date.now() + 86400000).toISOString(),
          parameters: "Curve25519/32byte random key",
          keyValue: keyMaterial.ourPublicKey,
        },
        nonce: keyMaterial.ourNonce,
      },
    },
  };

  if (!skipM3OutboundGateway()) {
    await deps.gateway.post({
      path: M3_GATEWAY_PATHS.dataRequest,
      body: initBody,
      target: "gateway",
      requestId: outboundRequestId,
      headers: { "X-HIU-ID": deps.xHiuId },
    });
  }

  await deps.m3DataTransfers.insert({
    iqTenantId: input.iqTenantId,
    transferId,
    sessionId: consentRow.sessionId,
    flowKind: "abdm.m3.hiu.v1",
    state: M3Hiu.DATA_REQUESTED,
    consentId: input.consentId,
    outboundRequestId,
    cmTransactionId: null,
    hiuPrivateKeyJwk: encryptedPrivate,
    hiuPublicKeyB64: keyMaterial.ourPublicKey,
    hiuNonceB64: keyMaterial.ourNonce,
    hipPublicKeyB64: null,
    hipNonceB64: null,
    dataPushUrl,
    bundleJson: null,
    error: null,
    awaitingPushUntil: null,
  });

  await deps.sessions.patch({
    iqTenantId: input.iqTenantId,
    sessionId: consentRow.sessionId,
    state: M3Hiu.DATA_REQUESTED,
    contextMerge: {
      consentId: input.consentId,
      transferId,
      hiuPublicKeyBase64: keyMaterial.ourPublicKey,
      transferNonceBase64: keyMaterial.ourNonce,
      hiuPrivateKeyJwk: encryptedPrivate,
      dateRange: permissionRange,
    },
  });

  return { transferId, state: M3Hiu.DATA_REQUESTED };
}
