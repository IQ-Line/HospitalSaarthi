import type { HipDataPushRequest } from "@hims/ts-sdk-abha/protocol/m3/hip-data-transfer.js";
import type { AbdmAdapterDeps } from "../../../ports.js";
import type { ParsedHiRequest } from "../../../lib/parse-hi-request-body.js";
import {
  checksumForContent,
  newPushRequestId,
} from "../../../data-access/hip-data-push.client.js";
import type { AbdmSession } from "../../../domain/session.js";
import { assertFlowKind } from "../../../domain/session.js";

export async function pushHealthInformationForSession(
  input: {
    iqTenantId: string;
    session: AbdmSession<"abdm.m3.hip.v1">;
    parsed: ParsedHiRequest;
    patientId: string;
  },
  deps: AbdmAdapterDeps,
): Promise<string[]> {
  assertFlowKind(input.session, "abdm.m3.hip.v1");
  if (!deps.dataPush) {
    throw new Error("HipDataPushClient not configured");
  }

  const bundles = await deps.recordFoundation.fetchBundlesForConsent({
    iqTenantId: input.iqTenantId,
    patientId: input.patientId,
    consentId: input.parsed.consentId,
    dateRange: input.parsed.dateRange,
  });

  await deps.sessions.patch({
    iqTenantId: input.iqTenantId,
    sessionId: input.session.sessionId,
    state: "BUNDLES_FETCHED",
  });

  const batch = await deps.fidelius.encryptBundlesForPeer({
    payloadJsons: bundles.map((b) => b.contentJson),
    peerPublicKey: input.parsed.peerPublicKey,
    peerNonce: input.parsed.peerNonce,
  });

  const entries: HipDataPushRequest["entries"] = bundles.map((bundle, i) => ({
    content: batch.encryptedPayloads[i]!,
    media: bundle.media,
    checksum: checksumForContent(batch.encryptedPayloads[i]!),
    careContextReference: bundle.careContextReference,
  }));

  await deps.sessions.patch({
    iqTenantId: input.iqTenantId,
    sessionId: input.session.sessionId,
    state: "BUNDLES_ENCRYPTED",
    contextMerge: {
      dataPushUrl: input.parsed.dataPushUrl,
      transactionId: input.parsed.transactionId,
    },
  });

  const keyMaterial = {
    cryptoAlg: "ECDH",
    curve: "Curve25519",
    dhPublicKey: {
      expiry: input.parsed.keyExpiry ?? new Date(Date.now() + 86400000).toISOString(),
      parameters: "Curve25519/32byte random key",
      keyValue: batch.ourPublicKey,
    },
    nonce: batch.ourNonce,
  };

  const pushBody: HipDataPushRequest = {
    pageNumber: 0,
    pageCount: 1,
    transactionId: input.parsed.transactionId,
    entries,
    keyMaterial,
  };

  await deps.dataPush.push({
    dataPushUrl: input.parsed.dataPushUrl,
    body: pushBody as unknown as Record<string, unknown>,
    requestId: newPushRequestId(),
  });

  await deps.sessions.patch({
    iqTenantId: input.iqTenantId,
    sessionId: input.session.sessionId,
    state: "BUNDLES_PUSHED",
  });

  return bundles.map((b) => b.careContextReference);
}
