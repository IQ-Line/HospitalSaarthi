import { describe, expect, it } from "vitest";
import { encryptBundlesViaMgrmtech } from "./fidelius-mgrmtech-encrypt.js";

describe("encryptBundlesViaMgrmtech", () => {
  it("rejects invalid peer public keys before encrypt", async () => {
    await expect(
      encryptBundlesViaMgrmtech({
        payloadJsons: ['{"resourceType":"Bundle"}'],
        peerPublicKey: "not-a-valid-key",
        peerNonce: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
        staticKeys: {
          privateKey: "B1qoKJ8ttzpNDPoV8RjqZ8KD0ZJzFVwAZ9Zun/FE5aY=",
          publicKey: "BBofDSn+cMI5BQNNzBxfilpcp8SewcG55P51KTkVsBA3DOBhyF85IbaDJzTECUYjVyxZyDpg9zqe6yxNM/In6rU=",
          nonce: "FUMKOfh2VwqKriX7va9w+ZZZvDSRboHcwpvSUyv5V/4=",
        },
      }),
    ).rejects.toThrow(/valid BouncyCastle curve25519/);
  });
});
