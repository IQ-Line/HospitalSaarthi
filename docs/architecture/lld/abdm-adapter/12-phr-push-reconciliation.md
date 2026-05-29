# ABDM M3 PHR Push Reconciliation

**Status:** Canonical direction for PR #140 follow-up and M3 HIP health-information push.

**Date:** 2026-05-28.

**Related:** [`08-m3-flows.md`](./08-m3-flows.md), [`09-m3-dev-guide.md`](./09-m3-dev-guide.md).

---

## Executive position

The statement "the PHR sandbox's static-key encryption protocol is incompatible with the normal HIU ephemeral-key protocol" is the wrong framing.

The target design is **one canonical M3 health information push implementation**:

- One in-process Fidelius encryption implementation.
- One encrypted push body builder.
- One key material shape on outbound pushes.
- One care-context filtering path.
- Narrow edge handling only where transport/runtime behavior genuinely differs (local loopback URL rewriting, receiver rejecting extra HTTP headers).

The certified production implementation (`hims/abdi-lims-backed`) did not have a separate PHR encryption branch. It used one Fidelius wrapper, passed in the receiver's inbound `keyMaterial`, encrypted the bundle, put the returned `keyToShare` into outbound `keyMaterial.dhPublicKey.keyValue`, and posted to the inbound `dataPushUrl`.

Reconciliation is not "add profiles" or "add several encryption backends." It is: **make The-HIMS use one Fidelius-compatible implementation that works for PHR, HIMS, LIMS, and loopback.**

---

## What the certified implementation proves

Production reference uses the same code path for HIP push independent of receiver:

1. Accept peer `keyMaterial` from `/hip/health-information/request`.
2. Call `FIDELIUS_BASE_URL/fiedlius-service/encrypt` with receiver/sender keys, nonces, and plaintext.
3. Receive `{ encryptedData, keyToShare }`.
4. Use `keyToShare` as outbound `keyMaterial.dhPublicKey.keyValue`.
5. Push the same body shape to the `dataPushUrl` received from CM.

Static constants in that code are a **persistence shortcut**, not an ABDM or PHR requirement. The encryption logic itself is receiver-agnostic.

---

## Key encoding detail

The IQ-Line/fiedlius-encryption service convention:

| Direction | Format |
|-----------|--------|
| `/keys/generate` public keys | Raw 65-byte uncompressed EC point |
| `/encrypt` receiver public key input | Raw 65-byte form |
| `/encrypt` `keyToShare` output | X509/SPKI DER base64 (`ECPublicKey.getEncoded()`) |
| `/decrypt` sender public key input | X509/SPKI form |

"Raw 65-byte key" versus "SPKI keyToShare" is **not** PHR versus non-PHR. The-HIMS should normalize this internally, not branch on receiver type.

---

## Canonical API

```typescript
interface FideliusHealthInformationEncryptor {
  encryptBundles(input: {
    payloadJsons: string[];
    receiverPublicKey: string;
    receiverNonce: string;
  }): Promise<{
    encryptedPayloads: string[];
    senderPublicKeyToShare: string; // SPKI keyToShare
    senderNonce: string;
  }>;

  decryptBundle(input: {
    encryptedPayload: string;
    senderPublicKeyToShare: string;
    senderNonce: string;
    receiverPrivateKey: string;
    receiverNonce: string;
  }): Promise<string>;
}
```

**Runtime behavior (single path):**

1. Generate one sender keypair and one sender nonce **per HIP push**.
2. Encrypt every bundle entry with that sender material and the receiver key/nonce.
3. Return sender public key in **SPKI keyToShare** form for outbound `keyMaterial.dhPublicKey.keyValue`.
4. Accept inbound public keys in raw 65-byte or SPKI form; normalize inside the crypto module.

The use-case must not choose an encryption engine based on `dataPushUrl`, env vars, or receiver type.

---

## Recommended canonical choices

| Concern | Choice |
|---------|--------|
| Algorithm | ABDM Fidelius ECDH, BC short-Weierstrass curve25519, HKDF-SHA256, AES-256-GCM |
| Outbound public key | SPKI `keyToShare` (certified Fidelius sidecar convention) |
| Inbound public key | Accept raw 65-byte point **or** SPKI; normalize internally |
| Nonce | 32-byte base64 sender nonce |
| Key lifecycle | Ephemeral sender keys per HIP push (no static HIP keys in runtime path) |
| Checksum | Literal `"string"` for all outbound M3 pushes until proven otherwise |
| Data-push headers | `Content-Type: application/json` only for arbitrary `dataPushUrl` |
| URL rewrite | Loopback mode only; production uses CM `dataPushUrl` unconditionally |

---

## What PR #140 gets right (keep)

- PHR sandbox transfer URL must not be rewritten to local HIU loopback in production.
- Certified Fidelius wire behavior works with PHR My Records sandbox.
- PHR accepts SPKI `keyToShare` in outbound `keyMaterial.dhPublicKey.keyValue`.
- PHR accepts literal checksum `"string"`.
- PHR does not need extra adapter headers on data-push POST.
- Consent care-context references must scope bundles (ABDM-7727).

Fold these facts into the single implementation — do not keep a PHR encryption fork.

---

## What must change

1. **Remove runtime sidecar/CLI/Java backend selection** — compatibility reference lives in `tools/fidelius-java-vector/` only (not adapter runtime).
2. **Implement TS SPKI keyToShare export** — byte-compatible with Java `ECPublicKey.getEncoded()`.
3. **Normalize public keys** — raw 65-byte and SPKI/X509 DER on encrypt and decrypt paths.
4. **One outbound keyMaterial builder** — always SPKI `keyToShare` in `dhPublicKey.keyValue`.
5. **One checksum convention** — literal `"string"` default.
6. **One data-push header policy** — minimal headers for external receivers.
7. **Loopback-only URL rewrite** — production/non-loopback uses CM URL as-is.
8. **Fail closed** — empty consent care-context refs; empty Record Foundation bundle results.
9. **Ephemeral per-push HIP keys** — static env keys are fixtures/diagnostics only.

---

## Decision

Adopt one canonical ABDM M3 health information push implementation. PHR compatibility must fall out of the same Fidelius encryptor and push-body builder used for every receiver. The adapter runtime uses one in-process TypeScript encryption path (`deps.fidelius.encryptBundles` / `decryptBundle`).
