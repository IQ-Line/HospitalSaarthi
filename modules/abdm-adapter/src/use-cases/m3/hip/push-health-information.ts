import type { HipDataPushRequest } from "@hims/ts-sdk-abha/protocol/m3/hip-data-transfer.js";
import type { AbdmAdapterDeps } from "../../../ports.js";
import type { ParsedHiRequest } from "../../../lib/parse-hi-request-body.js";
import {
  checksumForContent,
} from "../../../data-access/hip-data-push.client.js";
import { encryptBundlesForPhrSandbox } from "../../../lib/fidelius-phr-encrypt.js";
import type { AbdmSession } from "../../../domain/session.js";
import { assertFlowKind } from "../../../domain/session.js";
import { resolveHipDataPushUrl } from "../../../lib/resolve-hip-data-push-url.js";
import { extractConsentCareContextRefs } from "../../../lib/extract-consent-care-context-refs.js";
import {
  canonicalPhrPushKeyMaterial,
  isPhrSandboxDataPushUrl,
  PHR_SANDBOX_PUSH_CHECKSUM,
} from "../../../lib/is-phr-sandbox-push.js";
import { abdmWarn } from "../../../lib/abdm-adapter-log.js";
import { isValidBcCurve25519PublicKeyB64 } from "../../../lib/fidelius-curve25519-bc.js";
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
    abdmWarn("abdm.m3.hip_push.no_consent_care_contexts", {
      consentId: input.parsed.consentId,
      sessionId: input.session.sessionId,
    });
  }

  const bundles = await deps.recordFoundation.fetchBundlesForConsent({
    iqTenantId: input.iqTenantId,
    patientId: input.patientId,
    consentId: input.parsed.consentId,
    dateRange: input.parsed.dateRange,
    ...(careContextReferences.length > 0 ? { careContextReferences } : {}),
  });

  const phrSandbox = isPhrSandboxDataPushUrl(input.parsed.dataPushUrl);

  await deps.sessions.patch({
    iqTenantId: input.iqTenantId,
    sessionId: input.session.sessionId,
    state: M3Hip.BUNDLES_FETCHED,
  });

  const payloadJsons = bundles.map((b) => b.contentJson);
  const batch = phrSandbox
    ? await encryptBundlesForPhrSandbox({
        payloadJsons,
        peerPublicKey: input.parsed.peerPublicKey,
        peerNonce: input.parsed.peerNonce,
        fidelius: deps.fidelius,
      })
    : {
        ...(await deps.fidelius.encryptBundlesForPeer({
          payloadJsons,
          peerPublicKey: input.parsed.peerPublicKey,
          peerNonce: input.parsed.peerNonce,
        })),
        engine: "typescript" as const,
      };

  if (phrSandbox) {
    abdmWarn("abdm.m3.hip_push.phr_encrypt_engine", {
      engine: batch.engine,
      hipKeyToShareLen: batch.ourPublicKey.length,
      hipKeyToShareX509: batch.ourPublicKey.startsWith("MIIB"),
      hiuPubKeyValid: isValidBcCurve25519PublicKeyB64(input.parsed.peerPublicKey),
      consentId: input.parsed.consentId,
    });
  }

  const entries: HipDataPushRequest["entries"] = bundles.map((bundle, i) => ({
    content: batch.encryptedPayloads[i]!,
    media: bundle.media,
    checksum: phrSandbox
      ? PHR_SANDBOX_PUSH_CHECKSUM
      : checksumForContent(batch.encryptedPayloads[i]!),
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

  const keyMaterial = phrSandbox
    ? canonicalPhrPushKeyMaterial({
        hipPublicKeyB64: batch.ourPublicKey,
        hipNonceB64: batch.ourNonce,
        keyExpiry: input.parsed.keyExpiry,
      })
    : {
        cryptoAlg: "ECDH",
        curve: "Curve25519",
        dhPublicKey: {
          expiry:
            input.parsed.keyExpiry ??
            new Date(Date.now() + 86400000).toISOString(),
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

  return bundles.map((b) => b.careContextReference);
}
