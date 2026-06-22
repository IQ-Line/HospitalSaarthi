import { describe, expect, it } from "vitest";
import { parseHiRequestBody } from "../../../../../src/integrations/abdm/lib/parse-hi-request-body.js";

describe("parseHiRequestBody", () => {
  it("extracts consent, push URL, and key material from hiRequest wrapper", () => {
    const parsed = parseHiRequestBody(
      {
        hiRequest: {
          consent: { id: "consent-1" },
          dataPushUrl: "https://hiu.example/push",
          dateRange: { from: "2020-01-01", to: "2025-01-01" },
          keyMaterial: {
            nonce: "nonce-abc",
            dhPublicKey: { keyValue: "pub-key" },
          },
        },
      },
      "req-inbound",
    );
    expect(parsed?.consentId).toBe("consent-1");
    expect(parsed?.dataPushUrl).toBe("https://hiu.example/push");
    expect(parsed?.peerNonce).toBe("nonce-abc");
    expect(parsed?.peerPublicKey).toBe("pub-key");
  });

  it("prefers hiRequest.transactionId over inbound REQUEST-ID for push correlation", () => {
    const parsed = parseHiRequestBody(
      {
        hiRequest: {
          transactionId: "cm-txn-from-on-request",
          consent: { id: "consent-1" },
          dataPushUrl: "https://apissbx.abdm.gov.in/push",
          keyMaterial: {
            nonce: "nonce-abc",
            dhPublicKey: { keyValue: "pub-key" },
          },
        },
      },
      "inbound-request-id-header",
    );
    expect(parsed?.transactionId).toBe("cm-txn-from-on-request");
  });

  it("returns null when required fields are missing", () => {
    expect(parseHiRequestBody({ hiRequest: {} }, "req-1")).toBeNull();
  });
});
