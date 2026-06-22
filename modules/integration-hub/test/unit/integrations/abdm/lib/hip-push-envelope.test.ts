import { describe, expect, it } from "vitest";
import {
  canonicalHipPushKeyMaterial,
  HIP_PUSH_CHECKSUM_LITERAL,
  resolveHipPushChecksumMode,
} from "../../../../../src/integrations/abdm/lib/hip-push-envelope.js";
import { checksumForHipPushEntry } from "../../../../../src/integrations/abdm/lib/hip-push-checksum.js";
import { minimalSandboxBundleJson } from "../../../../../src/integrations/abdm/lib/hip-push-envelope.js";

describe("HIP push envelope", () => {
  it("uses literal checksum by default (production HIMS parity)", () => {
    expect(resolveHipPushChecksumMode()).toBe("literal");
    expect(
      checksumForHipPushEntry({
        encryptedContent: "cipher",
        plaintextJson: '{"a":1}',
      }),
    ).toBe(HIP_PUSH_CHECKSUM_LITERAL);
  });

  it("uses legacy HIMS keyMaterial shape on outbound push", () => {
    const km = canonicalHipPushKeyMaterial({
      hipPublicKeyB64: "hip-pub",
      hipNonceB64: "hip-nonce",
      keyExpiry: "2026-06-01T00:00:00.000Z",
    });
    expect(km.curve).toBe("Curve25519");
    expect(km.dhPublicKey.parameters).toBe("Curve25519/32byte random key");
    expect(km.dhPublicKey.keyValue).toBe("hip-pub");
  });

  it("minimal document bundle has Composition as first entry", () => {
    const bundle = JSON.parse(minimalSandboxBundleJson("VISIT-2026-001")) as {
      type: string;
      entry: { resource: { resourceType: string } }[];
    };
    expect(bundle.type).toBe("document");
    expect(bundle.entry[0]?.resource.resourceType).toBe("Composition");
  });
});
