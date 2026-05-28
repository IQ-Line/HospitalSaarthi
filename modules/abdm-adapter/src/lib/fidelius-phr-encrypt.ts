import type { FideliusEncryptor } from "../ports.js";
import {
  encryptViaFideliusCli,
  resolveFideliusCliPath,
} from "./fidelius-cli-subprocess.js";
import { isValidBcCurve25519PublicKeyB64 } from "./fidelius-curve25519-bc.js";
import {
  encryptViaFideliusHttpService,
  resolveFideliusHttpBaseUrl,
  resolveStaticFideliusHipKeys,
} from "./fidelius-http.client.js";
import { encryptBundlesForPeerStaticJava, exportFideliusKeyToShareB64 } from "./fidelius-java-subprocess.js";

export type PhrEncryptEngine =
  | "fidelius-http"
  | "fidelius-cli"
  | "fidelius-java"
  | "typescript";

function assertPeerKeyForPhr(peerPublicKey: string): void {
  if (!isValidBcCurve25519PublicKeyB64(peerPublicKey)) {
    throw new Error(
      "HIU public key is not a valid BouncyCastle curve25519 point (65-byte uncompressed EC). " +
        "PHR push requires mgrmtech Fidelius encryption; verify inbound keyMaterial.keyValue.",
    );
  }
}

export async function encryptBundlesForPhrSandbox(input: {
  payloadJsons: string[];
  peerPublicKey: string;
  peerNonce: string;
  fidelius: FideliusEncryptor;
}): Promise<{
  encryptedPayloads: string[];
  ourPublicKey: string;
  ourNonce: string;
  engine: PhrEncryptEngine;
}> {
  assertPeerKeyForPhr(input.peerPublicKey);

  const staticKeys = resolveStaticFideliusHipKeys();
  if (!staticKeys) {
    throw new Error(
      "PHR sandbox push requires static HIP Fidelius keys " +
        "(ABDM_FIDELIUS_HIP_PUBLIC_KEY, ABDM_FIDELIUS_HIP_PRIVATE_KEY, ABDM_FIDELIUS_HIP_NONCE)",
    );
  }

  const httpBase = resolveFideliusHttpBaseUrl();
  if (httpBase) {
    const encryptedPayloads: string[] = [];
    let keyToShare = staticKeys.publicKey;
    for (const plainTextData of input.payloadJsons) {
      const out = await encryptViaFideliusHttpService({
        baseUrl: httpBase,
        senderPrivateKey: staticKeys.privateKey,
        senderPublicKey: staticKeys.publicKey,
        senderNonce: staticKeys.nonce,
        receiverPublicKey: input.peerPublicKey,
        receiverNonce: input.peerNonce,
        plainTextData,
      });
      encryptedPayloads.push(out.encryptedData);
      keyToShare = out.keyToShare;
    }
    return {
      encryptedPayloads,
      ourPublicKey: keyToShare,
      ourNonce: staticKeys.nonce,
      engine: "fidelius-http",
    };
  }

  const cliPath = resolveFideliusCliPath();
  if (cliPath) {
    const encryptedPayloads: string[] = [];
    for (const plainTextData of input.payloadJsons) {
      const out = await encryptViaFideliusCli({
        cliPath,
        senderPrivateKey: staticKeys.privateKey,
        senderNonce: staticKeys.nonce,
        receiverPublicKey: input.peerPublicKey,
        receiverNonce: input.peerNonce,
        plainTextData,
      });
      encryptedPayloads.push(out.encryptedData);
    }
    const keyToShare = await exportFideliusKeyToShareB64(staticKeys.publicKey);
    return {
      encryptedPayloads,
      ourPublicKey: keyToShare,
      ourNonce: staticKeys.nonce,
      engine: "fidelius-cli",
    };
  }

  try {
    const java = await encryptBundlesForPeerStaticJava({
      payloadJsons: input.payloadJsons,
      hipPrivateKeyB64: staticKeys.privateKey,
      hipNonceB64: staticKeys.nonce,
      peerPublicKey: input.peerPublicKey,
      peerNonce: input.peerNonce,
    });
    const keyToShare = await exportFideliusKeyToShareB64(staticKeys.publicKey);
    return {
      encryptedPayloads: java.encryptedPayloads,
      ourPublicKey: keyToShare,
      ourNonce: java.ourNonce,
      engine: "fidelius-java",
    };
  } catch (javaErr) {
    const message = javaErr instanceof Error ? javaErr.message : String(javaErr);
    throw new Error(
      "PHR sandbox push requires Fidelius encryption (HTTP, CLI, or Java BC). " +
        `Set ABDM_FIDELIUS_SERVICE_URL or ABDM_FIDELIUS_CLI_PATH. Java fallback failed: ${message}`,
    );
  }
}
