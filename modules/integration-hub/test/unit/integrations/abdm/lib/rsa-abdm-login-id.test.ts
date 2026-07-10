import { describe, expect, it } from "vitest";
import {
  constants,
  generateKeyPairSync,
  privateDecrypt,
} from "node:crypto";
import { encryptLoginIdWithAbdmPublicKey } from "../../../../../src/integrations/abdm/lib/rsa-abdm-login-id.js";

describe("encryptLoginIdWithAbdmPublicKey", () => {
  it("round-trips OAEP-SHA1 against a locally generated RSA key", () => {
    const { publicKey, privateKey } = generateKeyPairSync("rsa", {
      modulusLength: 2048,
    });
    const spkiDer = publicKey.export({ type: "spki", format: "der" }) as Buffer;
    const publicKeyB64 = spkiDer.toString("base64");
    const plain = "123456789012";
    const encB64 = encryptLoginIdWithAbdmPublicKey(publicKeyB64, plain);
    const dec = privateDecrypt(
      {
        key: privateKey,
        padding: constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: "sha1",
      },
      Buffer.from(encB64, "base64"),
    );
    expect(dec.toString("utf8")).toBe(plain);
  });
});
