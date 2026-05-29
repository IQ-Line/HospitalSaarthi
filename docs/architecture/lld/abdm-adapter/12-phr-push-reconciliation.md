# ABDM M3 PHR Push Reconciliation

<<<<<<< HEAD
Status: guidance for PR #140 review and follow-up implementation.

Date: 2026-05-28.

## Executive Position

The statement "the PHR sandbox's static-key encryption protocol is incompatible with the normal HIU ephemeral-key protocol" is the wrong framing.

The target design should be one canonical M3 health information push implementation:

1. One in-process Fidelius encryption implementation.
2. One encrypted push body builder.
3. One key material shape on outbound pushes.
4. One care-context filtering path.
5. Narrow edge handling only where transport/runtime behavior genuinely differs, such as local loopback URL rewriting or a receiver rejecting extra HTTP headers.

The certified production implementation supports this direction. It did not have a separate PHR encryption branch. It used one `Fidelius` wrapper, passed in the receiver's inbound `keyMaterial`, encrypted the bundle, put the returned `keyToShare` into outbound `keyMaterial.dhPublicKey.keyValue`, and posted to the inbound `dataPushUrl`.

So the reconciliation is not "add profiles" and not "add several encryption backends." It is "make The-HIMS use one Fidelius-compatible implementation that works for PHR, HIMS, LIMS, and loopback."

## What The Certified Implementation Proves

The production `hims-production` reference at `/home/ayushiqline/projects/hims/abdi-lims-backed` uses the same code path for HIP push independent of receiver:

- `src/services/fidelius.ts` accepts peer `keyMaterial` from `/hip/health-information/request`.
- It calls `FIDELIUS_BASE_URL/fiedlius-service/encrypt` with:
  - `receiverPublicKey`
  - `receiverNonce`
  - `senderPrivateKey`
  - `senderPublicKey`
  - `senderNonce`
  - `plainTextData`
- It receives `{ encryptedData, keyToShare }`.
- `src/services/callbackService.ts` uses `keyToShare` as outbound `keyMaterial.dhPublicKey.keyValue`.
- It uses the sender nonce from configured Fidelius key material.
- It pushes the same body shape to the `dataPushUrl` it received.
- It does not branch by PHR, HIMS, LIMS, or environment pair.

The static constants in that code are not an ABDM or PHR requirement. They are a persistence shortcut: the implementation avoided having to generate and persist keypairs/nonces per transfer. That shortcut is not ideal, but it proves that the encryption logic itself can be agnostic.

## The Key Encoding Detail

The `IQ-Line/fiedlius-encryption` service explains a major source of confusion:

- `/keys/generate` returns public keys as raw 65-byte uncompressed EC points.
- `/encrypt` accepts the receiver public key in that raw 65-byte form.
- `/encrypt` returns `keyToShare` using Java `ECPublicKey.getEncoded()`, which is X509/SPKI DER base64.
- `/decrypt` expects the sender public key in that X509/SPKI form.

Therefore, "raw 65-byte key" versus "SPKI keyToShare" should not be modeled as PHR versus non-PHR. It is one Fidelius service convention: receive the HIU's raw `keyMaterial.dhPublicKey.keyValue`, and send back the HIP's shareable `keyToShare`.

The-HIMS should normalize this, not branch on receiver type.

## Single Implementation Direction

Define one canonical adapter-level encryptor backed by the TypeScript Fidelius implementation in this repo. The implementation must be byte-compatible with the certified Fidelius sidecar contract, including the shareable `keyToShare` public-key encoding.

```ts
=======
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
>>>>>>> origin/dev
interface FideliusHealthInformationEncryptor {
  encryptBundles(input: {
    payloadJsons: string[];
    receiverPublicKey: string;
    receiverNonce: string;
  }): Promise<{
    encryptedPayloads: string[];
<<<<<<< HEAD
    senderPublicKeyToShare: string;
=======
    senderPublicKeyToShare: string; // SPKI keyToShare
>>>>>>> origin/dev
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

<<<<<<< HEAD
This API should have exactly one runtime behavior:

- Generate one sender keypair and one sender nonce per HIP push.
- Encrypt every bundle entry in that push with that sender keypair, sender nonce, receiver public key, and receiver nonce.
- Return the sender public key in the shareable Fidelius `keyToShare` form expected in outbound `keyMaterial.dhPublicKey.keyValue`.
- Accept inbound public keys in the known Fidelius forms and normalize them inside the crypto module.

The use-case should not choose an encryption engine based on `dataPushUrl`, env vars, or receiver type. It should simply call:

```ts
const encrypted = await deps.fidelius.encryptBundles({
  payloadJsons,
  receiverPublicKey: parsed.peerPublicKey,
  receiverNonce: parsed.peerNonce,
});
```

Then build the push body once:

```ts
const pushBody = {
  pageNumber: 0,
  pageCount: 1,
  transactionId: parsed.transactionId,
  entries: bundles.map((bundle, i) => ({
    content: encrypted.encryptedPayloads[i]!,
    media: bundle.media,
    checksum: checksumForHealthInformationPush({
      encryptedPayload: encrypted.encryptedPayloads[i]!,
      plaintextJson: bundle.contentJson,
    }),
    careContextReference: bundle.careContextReference,
  })),
  keyMaterial: {
    cryptoAlg: "ECDH",
    curve: "Curve25519",
    dhPublicKey: {
      expiry: parsed.keyExpiry ?? new Date(Date.now() + 86400000).toISOString(),
      parameters: "Curve25519/32byte random key",
      keyValue: encrypted.senderPublicKeyToShare,
    },
    nonce: encrypted.senderNonce,
  },
};
```

This is the shape to keep. If PHR works with it and production HIMS worked with it, make it the single implementation.

## Recommended Canonical Choices

Use these choices:

- Encryption algorithm: ABDM Fidelius ECDH over BouncyCastle short-Weierstrass curve25519, HKDF-SHA256, AES-256-GCM.
- Encryption API: one `deps.fidelius.encryptBundles` call for HIP push.
- Public key to send: `keyToShare`/SPKI-compatible value, because that matches the certified Fidelius sidecar.
- Public key to receive: accept both raw 65-byte uncompressed EC point and SPKI, then normalize internally.
- Nonce: 32-byte base64 sender nonce.
- Key lifecycle: generate sender keys per HIP push. Do not use configured static sender keys in the runtime path.
- Checksum: use one value for all outbound M3 pushes. Until a stronger checksum is proven accepted by PHR sandbox and normal receivers, use literal `"string"` for parity with the certified implementation.
- Headers on arbitrary `dataPushUrl`: use one policy. Prefer `Content-Type: application/json` only, matching the certified implementation's plain `axios.post(url, data)`. Keep ABDM gateway headers for HIE-CM gateway APIs, not third-party `dataPushUrl` POSTs.

## What PR #140 Gets Right

PR #140 contains useful discoveries:

- The PHR sandbox transfer URL must not be rewritten to the local HIU loopback endpoint.
- The certified Fidelius wire behavior works with PHR My Records sandbox.
- The PHR sandbox accepted `keyToShare` in outbound `keyMaterial.dhPublicKey.keyValue`.
- The PHR sandbox accepted literal `checksum: "string"`.
- The PHR sandbox rejected or did not need extra adapter headers on the data-push POST.
- Consent care-context references need to scope the bundles pushed for ABDM-7727.

Keep those empirical facts, but fold them into the single implementation rather than keeping a PHR encryption fork.

## What Should Change In PR #140

1. Remove PHR-specific encryption selection.

`push-health-information.ts` should not choose between `encryptBundlesForPhrSandbox` and `deps.fidelius.encryptBundlesForPeer`. There should be one `deps.fidelius.encryptBundles` path.

2. Remove runtime sidecar/CLI/Java backend selection.

The HTTP sidecar, CLI, and Java code are useful as references and test-vector generators. They should not be runtime alternatives in the adapter. The TypeScript Fidelius implementation should emit the same observable wire output: compatible ciphertext, compatible `keyToShare`, and compatible nonce behavior.

3. Normalize public keys.

Add helpers that accept either:

- raw 65-byte uncompressed EC point base64, or
- X509/SPKI DER base64 from Fidelius `keyToShare`.

The encrypt/decrypt code should normalize to the point form internally. The use-cases should not care which form arrived.

4. Use one outbound `keyMaterial` builder.

Do not have `canonicalPhrPushKeyMaterial` separate from normal key material. The single builder should always produce:

```json
{
  "cryptoAlg": "ECDH",
  "curve": "Curve25519",
  "dhPublicKey": {
    "expiry": "...",
    "parameters": "Curve25519/32byte random key",
    "keyValue": "<senderPublicKeyToShare>"
  },
  "nonce": "<senderNonce>"
}
```

5. Use one checksum convention.

Switch all HIP push entries to `"string"` for parity with the certified implementation unless/until there is evidence that all target receivers accept a stronger checksum. Do not make checksum receiver-specific.

6. Use one data-push header policy.

For arbitrary receiver `dataPushUrl`, prefer the certified behavior: `Content-Type: application/json` and no extra adapter headers. Keep ABDM gateway headers for calls to HIE-CM gateway APIs, not necessarily for third-party `dataPushUrl` POSTs.

If a local loopback receiver needs tenant context, encode it in the loopback URL or transfer lookup, not by making production receiver calls carry internal headers.

7. Keep only URL-resolution conditional behavior.

The only acceptable PHR-specific branch in the use-case area is transport routing:

- Local loopback mode may rewrite URLs to this adapter's HIU endpoint.
- Real external `dataPushUrl` values, including PHR sandbox URLs, must not be rewritten.

Even this can be framed generically: never rewrite external receiver URLs unless explicit local loopback mode is enabled and the URL is known to be one of our own test receiver URLs.

8. Fix Record Foundation scoping.

PR #140 updates the port and mock to accept `careContextReferences`, but `record-foundation-client.http.ts` does not forward them to `/api/v1/disclosure/bundles`. Fix the live HTTP client before relying on the PR.

9. Fail closed when consent care contexts are unavailable.

For a consent-driven push, do not silently fetch all bundles when consent care-context extraction returns empty. That is unsafe for PHR and non-PHR alike.

## Static Versus Ephemeral Keys

Use these terms carefully in review comments:

- Static keys are not a PHR protocol requirement.
- Static keys were an operational shortcut in the certified implementation, not the design to copy.
- Ephemeral per-push keys are the single runtime direction for The-HIMS.
- HIU-side private keys for data requests must be persisted encrypted at rest until the HIP push arrives.
- HIP-side private keys for a push do not need to be persisted after encryption completes.

Do not keep a runtime switch between static and ephemeral HIP sender keys. If static keys remain anywhere, they should be limited to fixtures, migration aids, or explicitly temporary sandbox diagnostics.

## Suggested Handoff Wording

Use this with the PR author:

> The PHR push you got working is valuable, but let's not keep it as a PHR-specific encryption fork. The certified implementation used one Fidelius path for PHR/HIMS/LIMS-style receivers: take the receiver keyMaterial, encrypt via Fidelius, send back keyToShare in outbound keyMaterial, and post to dataPushUrl. Please fold the sidecar-compatible behavior into the single Fidelius port, normalize raw/SPKI public keys inside that port, use one outbound keyMaterial/checksum/header policy, and keep only the local-loopback URL rewrite as an environment-specific transport concern.

## Decision

Adopt one canonical ABDM M3 health information push implementation.

The adapter should not expose "PHR encryption", "normal HIU encryption", or push profiles in the use-case layer. PHR compatibility should fall out of the same Fidelius encryptor and push-body builder used for every receiver.

There should also be no runtime selection among HTTP sidecar, CLI, Java, and TypeScript encryption. The sidecar and Java implementation are references for compatibility tests; the adapter runtime should have one encryption path.
=======
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
>>>>>>> origin/dev
