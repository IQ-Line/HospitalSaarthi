# PR #140 Updated Review — ABDM M3 HIP Push / Fidelius Reconciliation

PR: https://github.com/IQ-Line/HospitalSaarthi/pull/140  
Reviewed head: `097b708077c33f06fed14f2ce1fd2b033e48b398`  
Base: `dev` / fetched locally as `origin-dev-review`  
Review date: 2026-05-28

## Verdict

Request changes before merging as the canonical ABDM adapter direction.

This update is materially better than the earlier PR head:

- `push-health-information.ts` no longer has an explicit `if (phrSandbox)` encryption branch.
- Care-context references are extracted and missing refs now fail closed.
- `record-foundation-client.http.ts` forwards `care_context_reference` query params.
- The push envelope/checksum/header decisions are moved into helpers.

However, it still does not fully do what we meant by "one implementation":

- Runtime encryption still chooses among HTTP sidecar, CLI subprocess, Java subprocess, and TypeScript.
- Static HIP sender keys are still the production/certified path.
- TypeScript still emits raw 65-byte public keys, not SPKI `keyToShare`.
- HIU-side decrypt still cannot accept SPKI sender public keys from a certified Fidelius sender.
- URL resolution can still override real external CM `dataPushUrl` values outside an allowlist.

So this is progress toward unifying the use-case, but not yet the singular implementation described in `docs/architecture/lld/abdm-adapter/12-phr-push-reconciliation.md`.

## Findings

### P1 — Still has multiple runtime encryption backends

Files:

- `modules/abdm-adapter/src/data-access/fidelius.ts:12-16`
- `modules/abdm-adapter/src/data-access/fidelius.ts:65-75`
- `modules/abdm-adapter/src/lib/fidelius-mgrmtech-encrypt.ts:40-109`
- `modules/abdm-adapter/src/lib/fidelius-cli-subprocess.ts:14-23`
- `modules/abdm-adapter/src/lib/fidelius-java-subprocess.ts:167-200`

The updated `FideliusEncryptor` now centralizes the decision inside the port, which is better than branching in `push-health-information.ts`. But it is still not a single runtime implementation. With static HIP keys set, it runs `HTTP -> CLI -> Java`; without static keys, it runs TypeScript.

The CLI path is especially not advisable for production:

- It passes private key material via process arguments.
- It depends on binary discovery and filesystem layout.
- It parses JSON from stdout.
- It adds subprocess latency and failure modes to a health-information callback path.

Recommendation:

- Remove CLI and Java subprocesses from the adapter runtime path.
- Keep Java/sidecar only as compatibility references or test-vector generators.
- Prefer one in-process TS Fidelius implementation with SPKI export.
- If SPKI DER takes too long, use the HTTP Fidelius sidecar as the single temporary implementation behind the port, not as one stage in a fallback chain.

### P1 — External pushes can silently fall back to TypeScript raw-key output

Files:

- `modules/abdm-adapter/src/data-access/fidelius.ts:65-75`
- `modules/abdm-adapter/src/lib/fidelius-crypto.ts:125-158`
- `modules/abdm-adapter/src/use-cases/m3/hip/push-health-information.ts:57-67`
- `modules/abdm-adapter/src/use-cases/m3/hip/push-health-information.ts:101-105`

When `ABDM_FIDELIUS_HIP_{PRIVATE,PUBLIC}_KEY` and nonce are absent, the port falls back to TypeScript encryption. That TS path returns `ourPublicKey` as a raw 65-byte EC point, not the certified sidecar's SPKI `keyToShare`.

The push use-case then puts that raw key into outbound `keyMaterial.dhPublicKey.keyValue`. That may work for this adapter's own loopback HIU, but it is not the certified production wire behavior we are trying to standardize on. For PHR or any receiver expecting Fidelius `keyToShare`, this can fail while looking like a successful push attempt.

Recommendation:

- Do not silently use TS raw-key output for real external `dataPushUrl` calls.
- Implement SPKI `keyToShare` export in TS and make TS the one runtime path, or require the HTTP sidecar as the one configured runtime path until TS reaches wire parity.
- Add a guard that rejects external pushes when the chosen runtime cannot emit SPKI `keyToShare`.

### P1 — HIU decrypt path still cannot accept certified SPKI `keyToShare`

Files:

- `modules/abdm-adapter/src/use-cases/m3/hiu/handle-bundle-push.ts:53-56`
- `modules/abdm-adapter/src/data-access/fidelius.ts:78-85`
- `modules/abdm-adapter/src/lib/fidelius-crypto.ts:162-170`
- `modules/abdm-adapter/src/lib/fidelius-curve25519-bc.ts:76-83`

The HIP push side now tries to send SPKI when the mgrmtech path is active, but the HIU receive side still passes `keyMaterial.dhPublicKey.keyValue` into `decryptFromPeerMaterial`, which calls `decodePeerPublicKeyPoint`. That helper only accepts a raw 65-byte uncompressed EC point.

This means this adapter may fail to decrypt a push from another HIP that uses the certified Fidelius sidecar and sends SPKI `keyToShare`.

Recommendation:

- Add public-key normalization that accepts both raw 65-byte point and X509/SPKI DER base64.
- Use it in both encrypt and decrypt paths.
- Add a round-trip test where the pushed `keyMaterial.dhPublicKey.keyValue` is SPKI, not raw point.

### P1 — URL resolution still overrides real external receiver URLs

Files:

- `modules/abdm-adapter/src/lib/resolve-hip-data-push-url.ts:17-22`
- `modules/abdm-adapter/src/lib/resolve-hip-data-push-url.ts:27-50`
- `modules/abdm-adapter/src/lib/resolve-hip-data-push-url.test.ts:39-64`

The comment says production should use the CM-provided `dataPushUrl`, but the implementation still looks up a stored transfer and replaces any CM URL whose host is not in `ABDM_M3_DATA_PUSH_NEVER_OVERRIDE_HOSTS`.

That means a real external HIU URL such as `webhook.site` or a non-PHR receiver can be replaced with this adapter's stored HIU transfer URL if a transfer row exists for the same consent. That is not the generic rule we want. The only rewrite should be explicit local loopback behavior.

Recommendation:

- Make production/non-loopback mode use `cmDataPushUrl` as-is.
- Keep rewrite behavior only when an explicit local harness/loopback mode is enabled and the target is known to be our own local HIU receiver.
- Remove the PHR-style host allowlist as a routing primitive; it is still receiver-specific transport behavior in disguise.

### P2 — Runtime still uses static HIP sender keys

Files:

- `modules/abdm-adapter/src/data-access/fidelius.ts:65-71`
- `modules/abdm-adapter/src/lib/fidelius-mgrmtech-encrypt.ts:26-37`
- `modules/abdm-adapter/src/lib/fidelius-mgrmtech-encrypt.ts:47-60`
- `services/abdm-adapter-svc/.env.example:100-105`

The branch treats static HIP keys as the production/certified path. That matches the old certified implementation's shortcut, but it does not match the direction in the reconciliation doc: generate sender keypair and sender nonce per HIP push.

Recommendation:

- If the HTTP sidecar is used as a temporary runtime hatch, call `/keys/generate` per push or otherwise generate per-push sender key material.
- Avoid baking static HIP sender keys into the canonical path.
- Keep static key envs only as temporary sandbox diagnostics or compatibility fixtures.

### P2 — Empty bundle results still push an empty transfer

File:

- `modules/abdm-adapter/src/use-cases/m3/hip/push-health-information.ts:42-80`

The code fails closed when consent care-context refs are empty, which is good. But if Record Foundation returns zero bundles for the requested refs, the use-case still encrypts an empty payload list, builds `entries: []`, and pushes an empty transfer.

Recommendation:

- After `fetchBundlesForConsent`, throw a clear error when `bundles.length === 0`.
- Include consent id, patient id, and care-context refs in the diagnostic log/error.

### P2 — Tests do not cover the risky paths

Files:

- `modules/abdm-adapter/src/lib/fidelius-mgrmtech-encrypt.test.ts:4-18`
- `modules/abdm-adapter/src/lib/hip-push-envelope.test.ts:10-30`
- `modules/abdm-adapter/src/data-access/hip-data-push.client.test.ts:33-51`

The new tests cover shape defaults and invalid peer-key rejection, but they do not cover:

- HTTP sidecar success returning SPKI `keyToShare`.
- CLI/Java fallback selection, if those remain.
- External push with missing static keys falling back to raw TypeScript key.
- HIU decrypt receiving SPKI sender public key.
- `push-health-information.ts` failing on empty RF bundle results.

Recommendation:

- Add tests for the public behavior we actually care about: one encrypt path returns SPKI `senderPublicKeyToShare`, one envelope builder uses that value, and HIU decrypt accepts SPKI.

## CLI Assessment

The CLI should not be part of runtime.

It is reasonable as a developer tool or fixture generator, but not in the adapter's production encryption path. Between process argument leakage, subprocess reliability, binary-path drift, stdout parsing, and callback latency, it is the least attractive option. If the team needs a fallback hatch while TS SPKI export is implemented, use the HTTP Fidelius sidecar as the one implementation behind the Fidelius port. That mirrors certified production much more closely than a CLI subprocess does.

## What The PR Does Well

- It moves away from `if (phrSandbox)` in the M3 HIP push use-case.
- It adds a reusable outbound `canonicalHipPushKeyMaterial` helper.
- It defaults checksum to literal `"string"`.
- It changes external data-push calls toward minimal headers.
- It fixes Record Foundation HTTP care-context forwarding.
- It fails closed when consent artefacts have no care contexts.

## Recommendation

Do not merge this as the final architecture direction yet.

Ask for one of these two reconciliations:

1. Preferred: implement TS SPKI `keyToShare` export and public-key normalization, then remove runtime HTTP/CLI/Java/static-key paths.
2. Temporary hatch: use the HTTP Fidelius sidecar as the single implementation behind the Fidelius port, remove CLI/Java fallback from runtime, and keep the use-case path single. This is acceptable because it mirrors certified production, but it should be framed as temporary until the TypeScript implementation reaches wire parity.

In both cases:

- Remove CLI runtime.
- Remove Java runtime fallback.
- Do not silently raw-key TS encrypt to external receivers.
- Fix URL resolution so only explicit local loopback rewrites URLs.
- Add SPKI decrypt coverage.
- Add empty-bundle fail-fast behavior.

## Verification

Attempted targeted Vitest run from `/home/ayushiqline/projects/draft/The-HIMS-pr140`:

```sh
pnpm exec vitest run --config modules/abdm-adapter/vitest.config.ts \
  modules/abdm-adapter/src/lib/extract-consent-care-context-refs.test.ts \
  modules/abdm-adapter/src/lib/hip-push-envelope.test.ts \
  modules/abdm-adapter/src/lib/resolve-hip-data-push-url.test.ts \
  modules/abdm-adapter/src/data-access/hip-data-push.client.test.ts \
  modules/abdm-adapter/src/data-access/record-foundation-client.http.test.ts \
  modules/abdm-adapter/src/lib/fidelius-mgrmtech-encrypt.test.ts \
  modules/abdm-adapter/src/use-cases/m3/m3-fidelius-roundtrip.test.ts
```

It did not run because `vitest` was not available in that worktree:

```text
ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL Command "vitest" not found
```

`git diff --check origin-dev-review...pr-140-current` passed with no whitespace errors.
