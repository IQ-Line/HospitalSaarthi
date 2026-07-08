import { createPublicKey, createVerify, X509Certificate, type KeyObject } from "node:crypto";
import { canonicalizeJson } from "./json-canonicalize.js";
import { abdmWarn } from "./abdm-adapter-log.js";
import { allowInsecureAbdmCallbacks } from "./abdm-runtime-env.js";
import { isM3MockGateway } from "./m3-runtime-env.js";

function loadCmVerifyPublicKey(certPem: string): KeyObject {
  try {
    return new X509Certificate(certPem).publicKey;
  } catch {
    return createPublicKey(certPem);
  }
}

/** Verify M3 on-fetch `consent.consentDetail` + `consent.signature`. */
export async function verifyM3ConsentArtefactSignature(input: {
  consentDetail: Record<string, unknown>;
  signature: string;
  consentId?: string;
}): Promise<boolean> {
  if (allowInsecureAbdmCallbacks() || isM3MockGateway()) {
    return true;
  }

  const signatureB64 = input.signature?.trim();
  if (!signatureB64) {
    abdmWarn("abdm.m3.consent.signature_missing", { consentId: input.consentId });
    return false;
  }

  const certPem = process.env["ABDM_CM_CONSENT_VERIFY_CERT_PEM"]?.trim();
  if (!certPem) {
    abdmWarn("abdm.m3.consent.signature_cert_unconfigured", {
      consentId: input.consentId,
    });
    return false;
  }

  try {
    const publicKey = loadCmVerifyPublicKey(certPem);
    const canonical = canonicalizeJson(input.consentDetail);
    if (canonical === undefined) return false;
    const payload = Buffer.from(canonical, "utf8");
    const signature = Buffer.from(signatureB64, "base64");
    const verifier = createVerify("RSA-SHA256");
    verifier.update(payload);
    verifier.end();
    return verifier.verify(publicKey, signature);
  } catch (e) {
    abdmWarn("abdm.m3.consent.signature_verify_failed", {
      consentId: input.consentId,
      message: e instanceof Error ? e.message : String(e),
    });
    return false;
  }
}
