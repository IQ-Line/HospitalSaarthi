/** Narrow global for runtimes that expose Web Crypto (Node.js 19+). */
type GlobalWithWebCrypto = typeof globalThis & {
  crypto?: { randomUUID?: () => string };
};

/** Cryptographically random UUID v4 (RFC 4122). */
export function randomUuid(): string {
  const cryptoApi = (globalThis as GlobalWithWebCrypto).crypto;
  const fn = cryptoApi?.randomUUID;
  if (typeof fn !== "function") {
    throw new Error("globalThis.crypto.randomUUID is not available (requires Node.js 19+)");
  }
  return fn.call(cryptoApi);
}
