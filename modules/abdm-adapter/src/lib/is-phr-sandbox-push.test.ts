import { describe, expect, it } from "vitest";
import {
  canonicalPhrPushKeyMaterial,
  minimalSandboxBundleJson,
  PHR_SANDBOX_PUSH_CHECKSUM,
} from "./is-phr-sandbox-push.js";

describe("PHR sandbox push envelope", () => {
  it("uses literal checksum string per legacy HIMS", () => {
    expect(PHR_SANDBOX_PUSH_CHECKSUM).toBe("string");
  });

  it("uses legacy HIMS keyMaterial shape on outbound push", () => {
    const km = canonicalPhrPushKeyMaterial({
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
