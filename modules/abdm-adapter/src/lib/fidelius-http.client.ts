import { fetchWithTimeout } from "./fetch-with-timeout.js";

/** mgrmtech/fidelius-cli HTTP `/encrypt` — same contract as legacy abdi-lims-backed. */
export async function encryptViaFideliusHttpService(input: {
  baseUrl: string;
  senderPrivateKey: string;
  senderPublicKey: string;
  senderNonce: string;
  receiverPublicKey: string;
  receiverNonce: string;
  plainTextData: string;
}): Promise<{ encryptedData: string; keyToShare: string }> {
  const url = `${input.baseUrl.replace(/\/+$/, "")}/encrypt`;
  const res = await fetchWithTimeout(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      receiverPublicKey: input.receiverPublicKey,
      receiverNonce: input.receiverNonce,
      senderPrivateKey: input.senderPrivateKey,
      senderPublicKey: input.senderPublicKey,
      senderNonce: input.senderNonce,
      plainTextData: input.plainTextData,
    }),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Fidelius HTTP encrypt failed ${res.status}: ${text.slice(0, 200)}`);
  }
  const json = JSON.parse(text) as { encryptedData?: string; keyToShare?: string };
  if (!json.encryptedData || !json.keyToShare) {
    throw new Error("Fidelius HTTP encrypt returned invalid body");
  }
  return { encryptedData: json.encryptedData, keyToShare: json.keyToShare };
}

export function resolveFideliusHttpBaseUrl(): string | undefined {
  const raw =
    process.env["ABDM_FIDELIUS_SERVICE_URL"]?.trim() ||
    process.env["FIDELIUS_BASE_URL"]?.trim();
  if (!raw) return undefined;
  return raw.endsWith("/fiedlius-service") ? raw : `${raw.replace(/\/+$/, "")}/fiedlius-service`;
}

export function resolveStaticFideliusHipKeys():
  | { privateKey: string; publicKey: string; nonce: string }
  | undefined {
  const privateKey = process.env["ABDM_FIDELIUS_HIP_PRIVATE_KEY"]?.trim();
  const publicKey = process.env["ABDM_FIDELIUS_HIP_PUBLIC_KEY"]?.trim();
  const nonce = process.env["ABDM_FIDELIUS_HIP_NONCE"]?.trim();
  if (!privateKey || !publicKey || !nonce) return undefined;
  return { privateKey, publicKey, nonce };
}
