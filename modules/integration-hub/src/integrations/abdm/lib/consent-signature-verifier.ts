import { createPublicKey, createVerify, X509Certificate, type KeyObject } from "node:crypto";
import { canonicalizeJson } from "./json-canonicalize.js";
import { abdmWarn } from "./abdm-adapter-log.js";
import { allowInsecureAbdmCallbacks } from "./abdm-runtime-env.js";
import type { ConsentNotifyRequest } from "@hims/ts-sdk-abha/protocol/m2";

function loadCmVerifyPublicKey(certPem: string): KeyObject {
  try {
    return new X509Certificate(certPem).publicKey;
  } catch {
    return createPublicKey(certPem);
  }
}

/**
 * Verifies consent artefact `notification.signature` (CM X.509 + RS256 over consentDetail).
 * Payload bytes use RFC 8785 JCS (same canonical form CM signing expects).
 */
export async function verifyConsentNotificationSignature(
  notification: ConsentNotifyRequest["notification"],
): Promise<boolean> {
  if (allowInsecureAbdmCallbacks()) {
    return true;
  }

  const signatureB64 = notification.signature?.trim();
  if (!signatureB64) {
    abdmWarn("abdm.m2.consent.signature_missing", { consentId: notification.consentId });
    return false;
  }

  const certPem = process.env["ABDM_CM_CONSENT_VERIFY_CERT_PEM"]?.trim();
  if (!certPem) {
    abdmWarn("abdm.m2.consent.signature_cert_unconfigured", {
      consentId: notification.consentId,
      hint: "Set ABDM_CM_CONSENT_VERIFY_CERT_PEM or ABDM_ALLOW_INSECURE_CALLBACKS for sandbox",
    });
    return false;
  }

  try {
    const publicKey = loadCmVerifyPublicKey(certPem);
    const canonical = canonicalizeJson(notification.consentDetail);
    if (canonical === undefined) {
      abdmWarn("abdm.m2.consent.signature_canonicalize_failed", {
        consentId: notification.consentId,
      });
      return false;
    }
    const payload = Buffer.from(canonical, "utf8");
    const signature = Buffer.from(signatureB64, "base64");
    const verifier = createVerify("RSA-SHA256");
    verifier.update(payload);
    verifier.end();
    return verifier.verify(publicKey, signature);
  } catch (e) {
    abdmWarn("abdm.m2.consent.signature_verify_failed", {
      consentId: notification.consentId,
      message: e instanceof Error ? e.message : String(e),
    });
    return false;
  }
}
