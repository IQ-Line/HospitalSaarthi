import { createSign, generateKeyPairSync } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import { canonicalizeJson as canonicalize } from "../../../../../src/integrations/abdm/lib/json-canonicalize.js";
import { verifyConsentNotificationSignature } from "../../../../../src/integrations/abdm/lib/consent-signature-verifier.js";

const fixturePath = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../../../src/integrations/abdm/test-fixtures/consent-signature-vector.json",
);

const sampleConsentDetail = {
  schemaVersion: "v3",
  consentId: "11111111-1111-1111-1111-111111111111",
  createdAt: "2026-01-01T00:00:00.000Z",
  patient: { id: "patient@sbx" },
  hip: { id: "IN3610001625" },
  hiu: { id: "HIU-SANDBOX" },
  purpose: { text: "Care Management", code: "CAREMGT", refUri: "https://example.com" },
  hiTypes: ["OPConsultation"],
  permission: {
    accessMode: "VIEW",
    dateRange: { from: "2020-01-01T00:00:00.000Z", to: "2030-01-01T00:00:00.000Z" },
    dataEraseAt: "2030-01-01T00:00:00.000Z",
    frequency: { unit: "HOUR", value: 1, repeats: 0 },
  },
};

function buildSignedFixture(): {
  consentDetail: typeof sampleConsentDetail;
  signature: string;
  cmCertPem: string;
  privateKeyPem: string;
} {
  const { publicKey, privateKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });
  const canonical = canonicalize(sampleConsentDetail);
  if (!canonical) throw new Error("canonicalize failed");
  const signer = createSign("RSA-SHA256");
  signer.update(canonical);
  signer.end();
  const signature = signer.sign(privateKey).toString("base64");
  return {
    consentDetail: sampleConsentDetail,
    signature,
    cmCertPem: publicKey as string,
    privateKeyPem: privateKey as string,
  };
}

describe("verifyConsentNotificationSignature", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  function stubProductionConsentVerify() {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ABDM_ALLOW_INSECURE_CALLBACKS", "false");
  }

  it("verifies RSA-SHA256 over JCS canonical consentDetail", async () => {
    const fixture = buildSignedFixture();
    stubProductionConsentVerify();
    vi.stubEnv("ABDM_CM_CONSENT_VERIFY_CERT_PEM", fixture.cmCertPem);

    const ok = await verifyConsentNotificationSignature({
      status: "GRANTED",
      consentId: fixture.consentDetail.consentId,
      consentDetail: fixture.consentDetail,
      signature: fixture.signature,
      grantAcknowledgement: true,
    });
    expect(ok).toBe(true);
  });

  it("rejects signature over tampered payload bytes", async () => {
    const fixture = buildSignedFixture();
    const canonical = canonicalize(fixture.consentDetail);
    expect(canonical).toBeTruthy();
    const badSigner = createSign("RSA-SHA256");
    badSigner.update(`${canonical} `);
    badSigner.end();
    const badSig = badSigner.sign(fixture.privateKeyPem).toString("base64");

    stubProductionConsentVerify();
    vi.stubEnv("ABDM_CM_CONSENT_VERIFY_CERT_PEM", fixture.cmCertPem);

    const ok = await verifyConsentNotificationSignature({
      status: "GRANTED",
      consentId: fixture.consentDetail.consentId,
      consentDetail: fixture.consentDetail,
      signature: badSig,
      grantAcknowledgement: true,
    });
    expect(ok).toBe(false);
  });

  it("writes committed fixture when UPDATE_CONSENT_FIXTURE=1", async () => {
    if (process.env["UPDATE_CONSENT_FIXTURE"] !== "1") return;
    const fixture = buildSignedFixture();
    writeFileSync(
      fixturePath,
      `${JSON.stringify(
        {
          description: "RSA-SHA256 over JCS(RFC 8785) consentDetail",
          consentDetail: fixture.consentDetail,
          signature: fixture.signature,
          cmCertPem: fixture.cmCertPem,
        },
        null,
        2,
      )}\n`,
    );
    expect(readFileSync(fixturePath, "utf8")).toContain("cmCertPem");
  });

  it("replays committed fixture", async () => {
    const fixture = JSON.parse(readFileSync(fixturePath, "utf8")) as {
      consentDetail: typeof sampleConsentDetail;
      signature: string;
      cmCertPem: string;
    };
    if (!fixture.cmCertPem) {
      throw new Error("Run UPDATE_CONSENT_FIXTURE=1 on consent-signature-verifier.test.ts");
    }
    stubProductionConsentVerify();
    vi.stubEnv("ABDM_CM_CONSENT_VERIFY_CERT_PEM", fixture.cmCertPem);
    const ok = await verifyConsentNotificationSignature({
      status: "GRANTED",
      consentId: fixture.consentDetail.consentId,
      consentDetail: fixture.consentDetail,
      signature: fixture.signature,
      grantAcknowledgement: true,
    });
    expect(ok).toBe(true);
  });
});
