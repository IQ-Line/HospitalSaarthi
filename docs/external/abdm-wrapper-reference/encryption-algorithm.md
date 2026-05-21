# ABDM Wrapper — Fidelius encryption (reference)

Source of truth: [NHA-ABDM/ABDM-wrapper](https://github.com/NHA-ABDM/ABDM-wrapper)

| Java | TypeScript |
|------|------------|
| `CipherKeyManager.java` | Ephemeral BC curve25519 key + 32-byte nonce per HIP push |
| `EncryptionService.java` | `modules/abdm-adapter/src/lib/fidelius-crypto.ts` |
| `DecryptionManager.java` | `decryptFromPeerMaterial()` |

## Curve form (critical)

NHA uses BouncyCastle `CustomNamedCurves.getByName("curve25519")` — **short Weierstrass** curve25519, not RFC 7748 Montgomery X25519.

- Wire `keyValue` = **65-byte** uncompressed EC point: `0x04 || X(32) || Y(32)` via `ECPublicKey.getQ().getEncoded(false)`.
- Node `crypto.generateKeyPairSync("x25519")` and 32-byte Montgomery keys **do not** interoperate with the gateway.
- TypeScript implementation: `@noble/curves` Weierstrass params from `org.bouncycastle.math.ec.custom.djb.Curve25519` in `fidelius-curve25519-bc.ts`.

## Algorithm (HIP → HIU)

1. **Nonces:** HIP `senderNonce`, HIU `receiverNonce` (each 32 random bytes, base64 on wire).
2. **XOR:** `combined[i] = sender[i] ^ receiver[i]`.
3. **Salt / IV:** `salt = combined[0..20)`, `iv = combined[20..32)`.
4. **ECDH:** `sharedSecret = ECDH(HIP_private, HIU_public)` over Weierstrass curve25519.
5. **HKDF:** SHA-256, IKM = shared secret bytes, salt = step 3, info = empty.
6. **AES-256-GCM:** wire = `base64(ciphertext || tag)` — IV is not prefixed in the blob.

## Tests

- `fidelius-crypto.test.ts` — HIP encrypt / HIU decrypt round-trip
- `fidelius-bc-vector.test.ts` — NHA spec 65-byte public key + deterministic vector
- `fidelius-java-vector.test.ts` — ciphertext matches Java `EncryptionService` (regenerate via `tools/fidelius-java-vector/`)
