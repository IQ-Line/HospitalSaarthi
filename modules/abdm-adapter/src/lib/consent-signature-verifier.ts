import { createVerify, X509Certificate } from "node:crypto";
import { abdmWarn } from "./abdm-adapter-log.js";
import { allowInsecureAbdmCallbacks } from "./abdm-runtime-env.js";
import type { ConsentNotifyRequest } from "@hims/ts-sdk-abha/protocol/m2/index.js";

/**
 * Verifies consent artefact `notification.signature` (CM X.509 + RS256 over consentDetail).
 * Set `ABDM_CM_CONSENT_VERIFY_CERT_PEM` to the consent manager signing certificate PEM.
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
    const cert = new X509Certificate(certPem);
    const publicKey = cert.publicKey;
    const payload = Buffer.from(
      JSON.stringify(notification.consentDetail),
      "utf8",
    );
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
