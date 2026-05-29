# PR #140 — Review Comment (To Post)

---

**Subject:** PR #140 — Strong progress, but request changes before merging as canonical direction

I did a deep-dive against the certified production implementation (`hims/abdi-lims-backed`) and the reconciliation design doc (`docs/architecture/lld/abdm-adapter/12-phr-push-reconciliation.md`).

This update is materially better than the earlier PR head:

- `push-health-information.ts` no longer has explicit `if (phrSandbox)` encryption branching.
- Care-context references are extracted and missing refs now fail closed.
- `record-foundation-client.http.ts` forwards `care_context_reference` query params.
- Push envelope/checksum/header decisions are moved into env-driven helpers.
- Engine selection is centralized inside the port rather than scattered in the use-case.

However, it still does not fully achieve "one canonical implementation." Below are the issues I think need addressing before this becomes the final direction.

---

## P1 — Multiple runtime encryption backends (not "one implementation")

`fidelius.ts:65-75` selects at runtime: static HIP keys → mgrmtech stack (HTTP → CLI → Java), no keys → TS BC. This centralizes the decision but keeps four runtime paths with different wire outputs.

The CLI subprocess is especially problematic for production:

- It passes HIP private key material via process arguments.
- It depends on binary discovery and filesystem layout.
- It parses JSON from stdout.
- It adds subprocess latency and failure modes to a health-information callback path.

**Recommendation:** Remove CLI and Java subprocesses from the adapter runtime path. Keep them only as compatibility references or test-vector generators. Prefer one in-process TS Fidelius implementation (see SPKI point below). If SPKI DER work takes too long, use the HTTP Fidelius sidecar as the single temporary implementation behind the port — not as one stage in a fallback chain.

---

## P1 — Silent raw-key fallback to external receivers

When `ABDM_FIDELIUS_HIP_*` env vars are absent, `fidelius.ts:74-75` falls back to TypeScript encryption, which returns `ourPublicKey` as a raw 65-byte EC point (not the certified sidecar's SPKI `keyToShare`).

The push use-case puts that raw key into outbound `keyMaterial.dhPublicKey.keyValue` (`push-health-information.ts:101-105`). That works for this adapter's own loopback HIU, but for any receiver expecting Fidelius X509 `keyToShare` (PHR, production HIMS, external HIP), it silently emits the wrong format.

**Recommendation:** Implement SPKI `keyToShare` export in TS and make TS the single runtime path, or require the HTTP sidecar as the one configured runtime path until TS reaches wire parity. Add a guard that rejects external pushes when the chosen runtime cannot emit SPKI `keyToShare`.

---

## P1 — HIU decrypt cannot accept certified SPKI `keyToShare`

`fidelius-crypto.ts:162-170` / `fidelius-curve25519-bc.ts:76-83`: The HIP push side can now emit SPKI when the mgrmtech path is active, but the HIU receive side still passes `keyMaterial.dhPublicKey.keyValue` into `decodePeerPublicKeyPoint`, which only accepts a raw 65-byte uncompressed EC point.

This means this adapter may fail to decrypt a push from another HIP that uses the certified Fidelius sidecar and sends SPKI `keyToShare`.

**Recommendation:** Add public-key normalization that accepts both raw 65-byte point and X509/SPKI DER base64. Use it in both encrypt and decrypt paths. Add a round-trip test where the pushed `keyMaterial.dhPublicKey.keyValue` is SPKI, not raw point.

---

## P1 — URL resolution overrides real external receiver URLs

`resolve-hip-data-push-url.ts:33-48`: The never-override allowlist defaults to `["apissbx.abdm.gov.in"]`. Any other external HIU URL (e.g. `webhook.site`, a partner HIP endpoint, a production HIU CM) whose host is *not* on that list can be silently replaced with this adapter's stored HIU transfer URL if a transfer row exists for the same consent.

The comment says production should use CM-provided `dataPushUrl` as-is, but the implementation still performs a lookup and replaces any CM URL whose host isn't blocklisted. That is still receiver-specific transport behavior in disguise.

**Recommendation:** Make production/non-loopback mode use `cmDataPushUrl` as-is unconditionally. Keep URL rewrite only when an explicit local loopback mode is enabled *and* the target is known to be our own local HIU receiver.

---

## P2 — Static HIP keys baked as the canonical path

`fidelius.ts:65-71` treats static HIP keys as the production path. The reconciliation doc's direction is to **generate sender keypair + sender nonce per HIP push** (one ephemeral HIP identity per transaction). Static keys were a certified production shortcut, not the target architecture.

**Recommendation:** If the HTTP sidecar is used as a temporary runtime hatch, call its key-generation endpoint per push or otherwise produce per-push sender key material. Keep static key env vars only as temporary sandbox diagnostics or compatibility fixtures.

---

## P2 — Empty bundle results still push an empty transfer

`push-health-information.ts:42-48` fails closed when consent care-context refs are empty, which is good. But if Record Foundation returns zero bundles for the requested refs (e.g. data not yet indexed), the use-case still encrypts an empty payload list, builds `entries: []`, and pushes an empty transfer.

**Recommendation:** After `fetchBundlesForConsent`, throw a clear error when `bundles.length === 0`. Include consent ID, patient ID, and care-context refs in the diagnostic message.

---

## P2 — Tests don't cover the risky paths

New tests cover shape defaults and invalid peer-key rejection, but not:

- HTTP sidecar success returning SPKI `keyToShare`.
- External push with missing static keys falling back to raw TS key (and being rejected).
- HIU decrypt receiving SPKI sender public key.
- `push-health-information.ts` failing on empty RF bundle results.

---

## Summary

This is solid progress — the use-case is unified, the branching is centralized, and several wire-format defaults now match production HIMS. But we're not fully at "one canonical implementation" yet. The remaining gaps (SPKI output parity, SPKI decrypt support, URL rewrite scoping, multi-backend runtime) mean I'd recommend holding off on merging this as the final architecture direction.

Two paths to reconciliation:

1. **Preferred:** Implement TS SPKI `keyToShare` export and public-key normalization, then remove runtime HTTP/CLI/Java/static-key paths so there is exactly one in-process implementation.
2. **Temporary hatch:** Use the HTTP Fidelius sidecar as the single implementation behind the Fidelius port, remove CLI/Java fallback from runtime, and keep the use-case path single. This mirrors certified production, but should be framed as temporary until TS reaches wire parity.

In both cases: remove CLI runtime, remove Java runtime fallback, do not silently raw-key TS encrypt to external receivers, fix URL resolution so only explicit loopback rewrites URLs, add SPKI decrypt coverage, and add empty-bundle fail-fast behavior.

---

**Design doc reference:** `docs/architecture/lld/abdm-adapter/12-phr-push-reconciliation.md`
