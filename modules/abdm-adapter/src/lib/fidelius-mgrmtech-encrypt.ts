import {
  encryptViaFideliusCli,
  resolveFideliusCliPath,
} from "./fidelius-cli-subprocess.js";
import { isValidBcCurve25519PublicKeyB64 } from "./fidelius-curve25519-bc.js";
import {
  encryptViaFideliusHttpService,
  resolveFideliusHttpBaseUrl,
} from "./fidelius-http.client.js";
import {
  encryptBundlesForPeerStaticJava,
  exportFideliusKeyToShareB64,
} from "./fidelius-java-subprocess.js";

export type MgrmtechEncryptEngine = "fidelius-http" | "fidelius-cli" | "fidelius-java";

function assertPeerKey(peerPublicKey: string): void {
  if (!isValidBcCurve25519PublicKeyB64(peerPublicKey)) {
    throw new Error(
      "Peer public key is not a valid BouncyCastle curve25519 point (65-byte uncompressed EC). " +
        "Verify inbound keyMaterial.dhPublicKey.keyValue.",
    );
  }
}

/** mgrmtech Fidelius stack (HTTP → CLI → Java) with static HIP sender keys — production parity. */
export async function encryptBundlesViaMgrmtech(input: {
  payloadJsons: string[];
  peerPublicKey: string;
  peerNonce: string;
  staticKeys: { privateKey: string; publicKey: string; nonce: string };
}): Promise<{
  encryptedPayloads: string[];
  ourPublicKey: string;
  ourNonce: string;
  engine: MgrmtechEncryptEngine;
}> {
  assertPeerKey(input.peerPublicKey);

  const httpBase = resolveFideliusHttpBaseUrl();
  if (httpBase) {
    const encryptedPayloads: string[] = [];
    let keyToShare = input.staticKeys.publicKey;
    for (const plainTextData of input.payloadJsons) {
      const out = await encryptViaFideliusHttpService({
        baseUrl: httpBase,
        senderPrivateKey: input.staticKeys.privateKey,
        senderPublicKey: input.staticKeys.publicKey,
        senderNonce: input.staticKeys.nonce,
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
      ourNonce: input.staticKeys.nonce,
      engine: "fidelius-http",
    };
  }

  const cliPath = resolveFideliusCliPath();
  if (cliPath) {
    const encryptedPayloads: string[] = [];
    for (const plainTextData of input.payloadJsons) {
      const out = await encryptViaFideliusCli({
        cliPath,
        senderPrivateKey: input.staticKeys.privateKey,
        senderNonce: input.staticKeys.nonce,
        receiverPublicKey: input.peerPublicKey,
        receiverNonce: input.peerNonce,
        plainTextData,
      });
      encryptedPayloads.push(out.encryptedData);
    }
    const keyToShare = await exportFideliusKeyToShareB64(input.staticKeys.publicKey);
    return {
      encryptedPayloads,
      ourPublicKey: keyToShare,
      ourNonce: input.staticKeys.nonce,
      engine: "fidelius-cli",
    };
  }

  try {
    const java = await encryptBundlesForPeerStaticJava({
      payloadJsons: input.payloadJsons,
      hipPrivateKeyB64: input.staticKeys.privateKey,
      hipNonceB64: input.staticKeys.nonce,
      peerPublicKey: input.peerPublicKey,
      peerNonce: input.peerNonce,
    });
    const keyToShare = await exportFideliusKeyToShareB64(input.staticKeys.publicKey);
    return {
      encryptedPayloads: java.encryptedPayloads,
      ourPublicKey: keyToShare,
      ourNonce: java.ourNonce,
      engine: "fidelius-java",
    };
  } catch (javaErr) {
    const message = javaErr instanceof Error ? javaErr.message : String(javaErr);
    throw new Error(
      "Fidelius encryption requires HTTP service, CLI, or Java BC when static HIP keys are set. " +
        `Set ABDM_FIDELIUS_SERVICE_URL or ABDM_FIDELIUS_CLI_PATH. Java fallback failed: ${message}`,
    );
  }
}
