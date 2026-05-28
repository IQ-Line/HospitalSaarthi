/** PHR My Records receives HIP push at apissbx transfer URL (not loopback ngrok HIU). */
export function isPhrSandboxDataPushUrl(dataPushUrl: string): boolean {
  try {
    return new URL(dataPushUrl).hostname.toLowerCase().includes("apissbx");
  } catch {
    return false;
  }
}

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

/** Production HIMS / PHR sandbox expect literal checksum on push (not MD5/sha256). */
export const PHR_SANDBOX_PUSH_CHECKSUM = "string";

/** Legacy HIMS / abdi-lims-backed push keyMaterial — do not echo PHR inbound curve/parameters. */
export function canonicalPhrPushKeyMaterial(input: {
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
