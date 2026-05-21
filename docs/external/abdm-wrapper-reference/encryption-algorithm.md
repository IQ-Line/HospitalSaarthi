# ABDM Wrapper — Fidelius encryption (reference)

Source of truth: [NHA-ABDM/ABDM-wrapper](https://github.com/NHA-ABDM/ABDM-wrapper)

| Java | TypeScript |
|------|------------|
| `CipherKeyManager.java` | Ephemeral X25519 key + 32-byte nonce per HIP push |
| `EncryptionService.java` | `modules/abdm-adapter/src/lib/fidelius-crypto.ts` |
| `DecryptionManager.java` | `decryptFromPeerMaterial()` |

## Algorithm (HIP → HIU)

1. **Nonces:** HIP `senderNonce`, HIU `receiverNonce` (each 32 random bytes, base64 on wire).
2. **XOR:** `combined[i] = sender[i] ^ receiver[i]` (receiver index wraps if lengths differ — wrapper uses same length).
3. **Salt / IV:** `salt = combined[0..20)`, `iv = combined[20..32)`.
4. **ECDH:** `sharedSecret = ECDH(HIP_private, HIU_public)` (Curve25519 / BouncyCastle in Java; Node `x25519` + `diffieHellman`).
5. **HKDF:** SHA-256, IKM = shared secret bytes, salt = step 3, info = empty (Java `HKDFParameters(..., null)`).
6. **AES-256-GCM:** encrypt plaintext; wire = `base64(ciphertext || tag)` — **IV is not prefixed** in the blob.

## Tests

- `fidelius-crypto.test.ts` — HIP encrypt / HIU decrypt round-trip
- `fidelius-wrapper-interop.test.ts` — XOR salt/IV + fixed-nonce vector aligned with `EncryptionService.java`
