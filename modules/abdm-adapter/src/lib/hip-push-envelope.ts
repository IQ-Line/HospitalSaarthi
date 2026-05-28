/** Production HIMS / abdi-lims-backed push keyMaterial — do not echo inbound curve/parameters. */
export function canonicalHipPushKeyMaterial(input: {
  hipPublicKeyB64: string;
  hipNonceB64: string;
  keyExpiry?: string;
}): {
  cryptoAlg: string;
  curve: string;
  dhPublicKey: {
    expiry: string;
    parameters: string;
    keyValue: string;
  };
  nonce: string;
} {
  return {
    cryptoAlg: "ECDH",
    curve: "Curve25519",
    dhPublicKey: {
      expiry:
        input.keyExpiry ?? new Date(Date.now() + 86400000).toISOString(),
      parameters: "Curve25519/32byte random key",
      keyValue: input.hipPublicKeyB64,
    },
    nonce: input.hipNonceB64,
  };
}

/** Legacy certified HIP push uses literal checksum (production HIMS parity). */
export const HIP_PUSH_CHECKSUM_LITERAL = "string";

export function minimalSandboxBundleJson(careContextReference: string): string {
  const ts = new Date().toISOString();
  const compositionId = "composition-1";
  return JSON.stringify({
    resourceType: "Bundle",
    id: careContextReference,
    meta: {
      profile: [
        "https://nrces.in/ndhm/fhir/r4/StructureDefinition/DocumentBundle",
      ],
    },
    type: "document",
    timestamp: ts,
    entry: [
      {
        fullUrl: `urn:uuid:${compositionId}`,
        resource: {
          resourceType: "Composition",
          id: compositionId,
          status: "final",
          type: { text: "Health document" },
          subject: { display: "Patient" },
          date: ts,
          title: careContextReference,
        },
      },
    ],
  });
}

export type HipPushChecksumMode = "literal" | "sha256" | "md5";

export function resolveHipPushChecksumMode(): HipPushChecksumMode {
  const raw = process.env["ABDM_M3_PUSH_CHECKSUM_MODE"]?.trim().toLowerCase();
  if (raw === "sha256" || raw === "md5" || raw === "literal") {
    return raw;
  }
  return "literal";
}
