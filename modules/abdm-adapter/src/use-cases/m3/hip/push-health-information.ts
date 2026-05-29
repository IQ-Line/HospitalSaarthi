import type { HipDataPushRequest } from "@hims/ts-sdk-abha/protocol/m3/hip-data-transfer.js";
import type { AbdmAdapterDeps } from "../../../ports.js";
import type { ParsedHiRequest } from "../../../lib/parse-hi-request-body.js";
import type { AbdmSession } from "../../../domain/session.js";
import { assertFlowKind } from "../../../domain/session.js";
import { resolveHipDataPushUrl } from "../../../lib/resolve-hip-data-push-url.js";
import { extractConsentCareContextRefs } from "../../../lib/extract-consent-care-context-refs.js";
import { canonicalHipPushKeyMaterial } from "../../../lib/hip-push-envelope.js";
import { checksumForHipPushEntry } from "../../../lib/hip-push-checksum.js";
import { abdmWarn } from "../../../lib/abdm-adapter-log.js";
import { isValidFideliusPublicKeyB64 } from "../../../lib/fidelius-public-key.js";
import { M3Hip } from "../../../lib/m3-fsm-states.js";

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

  const [m3Artefact, consentArtefact] = await Promise.all([
    deps.m3ConsentArtefactsHiu.findById(input.iqTenantId, input.parsed.consentId),
    deps.consentArtefacts.findById(input.iqTenantId, input.parsed.consentId),
  ]);
  const careContextReferences = extractConsentCareContextRefs({
    m3Artefact,
    consentArtefact,
  });
  if (careContextReferences.length === 0) {
    throw new Error(
      `No care context references in consent artefact (ABDM-7727): consentId=${input.parsed.consentId}`,
    );
  }

  const bundleEntries = [];
  for (const ref of careContextReferences) {
    const bundles = await deps.recordFoundation.listBundles({
      iqTenantId: input.iqTenantId,
      careContextId: ref,
    });
    bundleEntries.push(...bundles);
  }
  if (bundleEntries.length === 0) {
    throw new Error(
      `No bundles from Record Foundation for consent care contexts: consentId=${input.parsed.consentId} patientId=${input.patientId} refs=[${careContextReferences.join(", ")}]`,
    );
  }

  await deps.sessions.patch({
    iqTenantId: input.iqTenantId,
    sessionId: input.session.sessionId,
    state: M3Hip.BUNDLES_FETCHED,
  });

  const payloadJsons = bundleEntries.map((b) => b.contentJson);
  const batch = await deps.fidelius.encryptBundles({
    payloadJsons,
    peerPublicKey: input.parsed.peerPublicKey,
    peerNonce: input.parsed.peerNonce,
  });

  abdmWarn("abdm.m3.hip_push.fidelius_encrypt", {
    engine: "typescript",
    hipKeyToShareLen: batch.ourPublicKey.length,
    hipKeyToShareX509: batch.ourPublicKey.startsWith("MIIB"),
    peerPubKeyValid: isValidFideliusPublicKeyB64(input.parsed.peerPublicKey),
    consentId: input.parsed.consentId,
    entryCount: bundleEntries.length,
  });

  const entries: HipDataPushRequest["entries"] = bundleEntries.map((bundle, i) => ({
    content: batch.encryptedPayloads[i]!,
    media: bundle.media,
    checksum: checksumForHipPushEntry({
      encryptedContent: batch.encryptedPayloads[i]!,
      plaintextJson: bundle.contentJson,
    }),
    careContextReference: bundle.careContextReference,
  }));

  const dataPushUrl = await resolveHipDataPushUrl(
    {
      iqTenantId: input.iqTenantId,
      consentId: input.parsed.consentId,
      cmDataPushUrl: input.parsed.dataPushUrl,
    },
    deps,
  );

  await deps.sessions.patch({
    iqTenantId: input.iqTenantId,
    sessionId: input.session.sessionId,
    state: M3Hip.BUNDLES_ENCRYPTED,
    contextMerge: {
      dataPushUrl,
      transactionId: input.parsed.transactionId,
    },
  });

  const keyMaterial = canonicalHipPushKeyMaterial({
    hipPublicKeyB64: batch.ourPublicKey,
    hipNonceB64: batch.ourNonce,
    keyExpiry: input.parsed.keyExpiry,
  });

  const pushBody: HipDataPushRequest = {
    pageNumber: 0,
    pageCount: 1,
    transactionId: input.parsed.transactionId,
    entries,
    keyMaterial,
  };

  await deps.dataPush.push({
    dataPushUrl,
    body: pushBody as unknown as Record<string, unknown>,
    requestId: input.parsed.transactionId,
    iqTenantId: input.iqTenantId,
    xHipId: deps.xHipId,
    xCmId: deps.xCmId,
  });

  await deps.sessions.patch({
    iqTenantId: input.iqTenantId,
    sessionId: input.session.sessionId,
    state: M3Hip.BUNDLES_PUSHED,
  });

  return bundleEntries.map((b) => b.careContextReference);
}
