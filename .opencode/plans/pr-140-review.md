# PR #140 Review — ABDM PHR Sandbox Push + Fidelius Encryption Backends

**PR:** `dev` ← `master-data-code`
**Author:** kamal-iqline
**Worktree:** `../The-HIMS-pr140` (git worktree of head ref)
**Stats:** +1671 / -2015 across 62 files (40+ are frontend deletions from a separate ABHA wizard refactor)

---

## 1. What this PR actually does

Two independent changes bundled in one branch:

### 1a. ABHA M1 wizard frontend refactor (deletions)

`services/web/src/features/abha/` — massive cleanup: removed `m1-enrolment.ts`, `abha-number-segment-input.tsx`, `abha-wizard-login-steps.tsx`, `types.ts`, `abha-address-validation.ts`, `download-abha-card.ts`, and gutted `use-abha-wizard.ts` (516 → ~80 lines). This is **not related to the PHR sandbox** — it's a separate ABHA enrollment simplification that happened to land on the same branch.

### 1b. ABDM PHR sandbox data push (backend additions)

The core change: when the CM's `dataPushUrl` points to the PHR sandbox (`apissbx.abdm.gov.in`), the HIP push path diverges from the normal flow entirely — different encryption engine, different wire format, different key material shape, different HTTP headers.

---

## 2. Architecture: Fidelius Encryption

### Core crypto (shared by ALL paths)

- **ECDH** on BouncyCastle **short Weierstrass** curve25519 (NOT RFC 7748 Montgomery X25519)
- **Key format:** wire `keyValue` = 65-byte uncompressed EC point: `0x04 || X(32) || Y(32)`
- **Nonces:** sender + receiver each 32 random bytes, base64 on wire
- **XOR:** `combined[i] = sender[i] ^ receiver[i]` → salt = `combined[0..20)`, IV = `combined[20..32)`
- **HKDF:** SHA-256, IKM = shared secret bytes, salt, info = empty → 32-byte AES key
- **AES-256-GCM:** wire = `base64(ciphertext || tag)`

Reference: `docs/external/abdm-wrapper-reference/encryption-algorithm.md`
TS impl: `modules/abdm-adapter/src/lib/fidelius-crypto.ts`
NHA spec: https://github.com/NHA-ABDM/ABDM-wrapper

### Two fundamentally different push paths

| Aspect | Normal HIU Push | PHR Sandbox Push |
|---|---|---|
| HIP keys | Ephemeral per-push | Static, pre-registered with NHA |
| `keyToShare` format | Raw 65-byte EC point (base64) | X509 SPKI (base64, starts `MIIB...`) |
| Checksum | SHA-256 of ciphertext | Literal `"string"` |
| `REQUEST-ID` / `TIMESTAMP` headers | Sent | Omitted |
| `x-tenant-id` header | Sent | Omitted |
| Encryption engine | Pure TypeScript (`@noble/curves`) | HTTP / CLI / Java subprocess |
| URL resolution | May be overridden (loopback) | Always CM-provided URL |

### PHR encryption backend chain (priority order)

```
encryptBundlesForPhrSandbox()
  ├── [1] HTTP sidecar (fastest)
  │   └── env: ABDM_FIDELIUS_SERVICE_URL
  │   └── POST /encrypt → { encryptedData, keyToShare }
  ├── [2] CLI binary subprocess
  │   └── env: ABDM_FIDELIUS_CLI_PATH
  │   └── `fidelius-cli e <args>` → JSON stdout
  └── [3] Java subprocess (last resort)
      └── javac-once (cached), java per push
      └── requires BouncyCastle jar in ~/.m2
      └── output: JSON on stdout
```

Only one is ever used. Java is never invoked if HTTP or CLI is configured.

---

## 3. New files

All under `modules/abdm-adapter/src/lib/`:

| File | Purpose |
|---|---|
| `fidelius-phr-encrypt.ts` | Orchestrator — tries HTTP → CLI → Java → throw |
| `fidelius-http.client.ts` | POST to mgrmtech/fidelius sidecar, returns `encryptedData` + `keyToShare` (X509 SPKI) |
| `fidelius-cli-subprocess.ts` | Spawn `fidelius-cli e <args>`, parse JSON stdout |
| `fidelius-java-subprocess.ts` | Compile Java sources on first call, spawn `java -cp ...` per push |
| `is-phr-sandbox-push.ts` | `isPhrSandboxDataPushUrl()`, `canonicalPhrPushKeyMaterial()`, `PHR_SANDBOX_PUSH_CHECKSUM` |
| `extract-consent-care-context-refs.ts` | Extract care context refs from M3/M2 consent artefacts (PHR ABDM-7727) |
| `fidelius-curve25519-bc.ts` | Added `isValidBcCurve25519PublicKeyB64()` |

Modified files:

| File | Change |
|---|---|
| `push-health-information.ts` | `if (phrSandbox)` branches for encryption, checksum, keyMaterial shape |
| `resolve-hip-data-push-url.ts` | Short-circuit PHR URLs (never loopback override) |
| `hip-data-push.client.ts` | PHR transfers omit REQUEST-ID/TIMESTAMP headers |
| `parse-hi-request-body.ts` | Added `peerCryptoAlg`, `peerCurve`, `peerParameters` passthrough |
| `ports.ts` | Added `xHipId`, `xCmId` to `HipDataPushClient.push()` |
| `ts-sdk-abha` protocol types | Added `xHipId`, `xCmId` to push request type |

---

## 4. The "Loopback HIU Transfer Override" explained

### Why it exists

When running both HIU and HIP roles on the same dev machine, the M3 flow is:

```
HIU (us) → CM (ABDM sandbox) → HIP (us)
              ↓                     ↓
       dataPushUrl =           "please push here"
       https://cm.gateway/...
```

The CM sends the HIP a `dataPushUrl` that routes through the CM gateway. But in development, we want the data to stay local — pushing through the real CM is unnecessary and slow.

### How it works

1. **HIU `start-data-request.ts:58`** constructs `dataPushUrl = "${adapterBaseUrl}/api/v3/hiu/health-information/transfer/${transferId}"` — a URL pointing back to this adapter's own HIU receive endpoint.

2. **`m3_data_transfers`** stores this URL alongside the consent's `cmTransactionId`, HIU key material, etc.

3. **HIP `resolve-hip-data-push-url.ts`** when pushing data:
   - If `isM3LoopbackHiu()` → skip override (line 22-24)
   - If CM host == our host or localhost → use CM URL directly (lines 33-35)
   - Otherwise → look up `m3_data_transfers.findLatestActiveByConsentId()` and use the **locally saved** `transfer.dataPushUrl` instead of the CM's URL (lines 41-47)

4. This "loops back" the push to the local HIU endpoint instead of going through the real CM.

### Why PHR must bypass this

The PHR sandbox at `apissbx.abdm.gov.in` is a **real external service**, not a local loopback. If the override kicked in:
- PHR-encrypted data would go to a local ngrok URL that can't decrypt it (RSA wrapping / key format mismatch)
- The PHR sandbox's static-key encryption protocol is incompatible with the normal HIU ephemeral-key protocol
- The receiver (local HIU endpoint) would fail or silently drop the data

The `isPhrSandboxDataPushUrl` guard in `resolve-hip-data-push-url.ts:27-29` short-circuits to always use the CM-provided URL.

---

## 5. Why the implementation can't be "agnostic to PHR vs normal"

The PHR sandbox and a standard HIU talk **different dialects of the same spec**. The divergence points:

1. **Encryption keys**: Normal HIU uses ephemeral keys (fresh ECDH keypair per push). PHR sandbox requires static pre-registered HIP keys supplied via env vars.

2. **`keyToShare` format**: Normal = raw 65-byte EC point. PHR sandbox = X509 SubjectPublicKeyInfo (Java `ECPublicKey.getEncoded()`). The TS `@noble/curves` output is the raw point; X509 SPKI requires ASN.1 encoding (trivial in Java, non-trivial in JS without a library).

3. **Checksum**: Normal = SHA-256 hex of ciphertext. PHR = literal string `"string"`.

4. **HTTP headers**: Normal sends `REQUEST-ID`, `TIMESTAMP`, `x-tenant-id`. PHR omits them — the PHR sandbox rejects requests with these headers.

5. **Key material shape**: Normal echoes inbound `cryptoAlg`/`curve`/`parameters` from the HI request. PHR uses a canonical shape that ignores inbound metadata.

Items 1-5 are not abstractions you can hide behind a single `encrypt()` call — they affect the **entire push request structure** (body, headers, URL resolution). The only clean way to handle this is:
- A strategy/interface per receiver type (see §8 suggestion)
- Or a middleware pipeline where each step is conditional

**The developer's friction**: they needed to make the push work with a receiver that doesn't conform to the standard ABDM wrapper protocol. The `if (phrSandbox)` branches are the natural result of "this receiver speaks differently."

---

## 6. How the CLI and Java subprocesses work

### CLI (`fidelius-cli-subprocess.ts`)

- Binary: mgrmtech/fidelius-cli (Go build of the same BC-Java crypto)
- Invocation: `fidelius-cli e <plainTextData> <senderNonce> <receiverNonce> <senderPrivateKey> <receiverPublicKey>`
- Output: `{"encryptedData": "<base64>"}` to stdout
- **Does NOT return `keyToShare`** — so the orchestrator calls `exportFideliusKeyToShareB64()` (Java-only) separately when using the CLI backend
- `runCli()` spawns process, collects stdout/stderr, uses `extractJsonObject()` to find JSON in noisy output

### HTTP sidecar (`fidelius-http.client.ts`)

- Same CLI running as daemon on `ABDM_FIDELIUS_SERVICE_URL`
- POST `{ receiverPublicKey, receiverNonce, senderPrivateKey, senderPublicKey, senderNonce, plainTextData }` to `/encrypt`
- Response: `{ "encryptedData": "...", "keyToShare": "..." }`
- The `keyToShare` field is X509 SPKI base64 — required by PHR sandbox for the `dhPublicKey.keyValue` in the push body
- This is the **preferred backend** (no subprocess overhead, fastest)

### Java subprocess (`fidelius-java-subprocess.ts`)

- Compiles Java sources at `tools/fidelius-java-vector/src/main/java/*.java` on **first call** using `javac`
- Requires BouncyCastle jar at `~/.m2/repository/org/bouncycastle/bcprov-jdk18on`
- Caches compiled classpath; recompiles only if source mtime changes
- `java -cp <classpath> FideliusStaticEncrypt <stdin JSON>` per push
- Also has `FideliusKeyToShare` for converting raw 65-byte pubkey → X509 SPKI (used by CLI fallback path)
- Three Java classes:
  - `FideliusLiveEncrypt`: generates ephemeral keypair, encrypts, returns pubkey+nonce+payloads
  - `FideliusStaticEncrypt`: uses provided static HIP key, encrypts, returns pubkey+nonce+payloads
  - `FideliusKeyToShare`: converts raw 65-byte BC public key to X509 SPKI format
- Performance: ~500-1000ms per push (JVM startup dominant)
- Can be disabled: `ABDM_FIDELIUS_JAVA_ENCRYPT=false`

---

## 7. Key observations for review

### P1 — Hostname check is too broad (`is-phr-sandbox-push.ts:4`)

```typescript
return new URL(dataPushUrl).hostname.toLowerCase().includes("apissbx");
```

Any hostname containing `apissbx` anywhere would match — `fake-apissbx.evil.com`, `apissbx-prod.attacker.net`. Should use exact match or suffix match:

```typescript
const host = new URL(dataPushUrl).hostname.toLowerCase();
return host === "apissbx.abdm.gov.in" || host.endsWith(".apissbx.abdm.gov.in");
```

Or use an allowlist env var for customizability.

### P2 — Typosquatted endpoint path (`fidelius-http.client.ts:42`)

```typescript
return raw.endsWith("/fiedlius-service") ? raw : `${raw}/fiedlius-service`;
```

`fiedlius` is missing the second `e` (should be `fidelius-service`). This was likely inherited from the legacy abdi-lims env var. At minimum document the variable, or better, make the base URL self-contained without appending a path suffix.

### P2 — Flat `lib/` file structure

7 new files added directly to `lib/`:
- `fidelius-phr-encrypt.ts`
- `fidelius-http.client.ts`
- `fidelius-cli-subprocess.ts`
- `fidelius-java-subprocess.ts`
- `is-phr-sandbox-push.ts`
- `extract-consent-care-context-refs.ts`

These should be grouped under `lib/fidelius/`:
```
lib/fidelius/
  encrypt.ts           (← fidelius-phr-encrypt.ts)
  http.client.ts       (← fidelius-http.client.ts)
  cli-subprocess.ts    (← fidelius-cli-subprocess.ts)
  java-subprocess.ts   (← fidelius-java-subprocess.ts)
  crypto.ts            (← existing fidelius-crypto.ts)
  curve25519-bc.ts     (← existing fidelius-curve25519-bc.ts)
  is-phr-sandbox-push.ts
```
And `extract-consent-care-context-refs.ts` should go in a separate module path or `lib/consent/`.

### P2 — Java subprocess dependency chain

- Requires `javac` on PATH at runtime
- Requires BouncyCastle jar in `~/.m2` (developer must run Maven manually as a prerequisite — line 31 error message says so)
- First call compiles Java sources: ~2-5s javac overhead → could timeout the ABDM gateway callback
- Compiles to `mkdtempSync` under `tmpdir()` — no cleanup logic visible
- Cached classpath never invalidated on version change (only source mtime checked — what if BouncyCastle jar changes?)

This is acceptable as a last-resort fallback, but the dev experience should be documented in `.env.example` (which was updated — good).

### P2 — `fidelius-cli` subprocess: CLI path resolution scans `process.cwd()` candidates

`resolveFideliusCliPath()` scans `process.cwd()` for candidate paths. In an Nx monorepo, `process.cwd()` may be the workspace root or the module root depending on how the service is started. This is fragile.

### P3 — Architecture: inline `if (phrSandbox)` pattern

In `push-health-information.ts`, 5+ conditional blocks check `phrSandbox`:

- Line 67-81: encryption engine selection
- Line 83-91: logging/diagnostics
- Line 96-100: checksum
- Line 121-138: keyMaterial shape
- Implicit: the `resolveHipDataPushUrl` call already has the check embedded

This couples the push logic to the receiver type. Suggestion: extract a `PushStrategy` interface:

```typescript
interface HipPushStrategy {
  encrypt(payloadJsons, peerPublicKey, peerNonce): EncryptionResult;
  buildChecksum(ciphertext: string): string;
  buildKeyMaterial(ourPublicKey, ourNonce, keyExpiry): KeyMaterial;
  buildHeaders(): Record<string, string>;
}
```

Implement `NormalHiuPushStrategy` and `PhrSandboxPushStrategy`, then the main function just delegates:

```typescript
const strategy = phrSandbox ? new PhrSandboxPushStrategy(deps, env) : new NormalHiuPushStrategy(deps);
const encrypted = await strategy.encrypt(payloadJsons, peerPublicKey, peerNonce);
const checksum = encrypted.payloads.map(p => strategy.buildChecksum(p));
// ...
```

### P3 — Mixed concerns in this branch

The PR mixes:
- PHR sandbox backend encryption (7 new lib files)
- Frontend ABHA wizard cleanup (40 files deleted/refactored)
- `opd-svc/uv.lock` change (unrelated, possibly accidental)
- Various one-liner fixes (link-token-cache, hi-type-mapper, M2 gateway ABHA number)
- New `xHipId`/`xCmId` fields on ports

These should ideally be separate PRs, but since they're all minor improvements that happened during the PHR sprint, this is a pragmatic bundling.

### P3 — `resolveFideliusHttpBaseUrl` double-slashes

```typescript
return raw.endsWith("/fiedlius-service") ? raw : `${raw.replace(/\/+$/, "")}/fiedlius-service`;
```

If `raw` has trailing slash(es), they're replaced before appending the path — but then `encryptViaFideliusHttpService` does:
```typescript
const url = `${input.baseUrl.replace(/\/+$/, "")}/encrypt`;
```

This double-normalizes. At minimum the path construction should happen in one place (either the resolver or the caller), not both.

---

## 8. Suggested improvements

### Refactor: Strategy pattern for push logic

```typescript
// lib/fidelius/push-strategy.ts
export interface HipPushStrategy {
  encrypt(input: {
    payloadJsons: string[];
    peerPublicKey: string;
    peerNonce: string;
  }): Promise<EncryptionResult & { checksums: string[] }>;

  buildKeyMaterial(input: {
    ourPublicKey: string;
    ourNonce: string;
    keyExpiry?: string;
  }): HipDataPushRequest["keyMaterial"];

  buildHeaders(input: {
    requestId: string;
    iqTenantId?: string;
  }): Record<string, string>;
}
```

### Fix: Subprocess cleanup

Add a module-level `process.on("exit")` or `async-dispose` hook to clean up Java compile temp directories. Currently `mkdtempSync` is never cleaned up.

### Fix: Better hostname matching

Replace `.includes("apissbx")` with an allowlist (env var `ABDM_PHR_SANDBOX_HOSTS`) defaulting to `apissbx.abdm.gov.in`.

### Fix: Make Java optional at compile time

The `exports` map in `package.json` should make `fidelius-java-subprocess.ts` tree-shakeable — currently all 4 files are imported through `fidelius-phr-encrypt.ts`. If Java isn't available, the import itself would fail at module resolution if the source doesn't exist. (Node.js ESM doesn't tree-shake.)

### Consider: Pure TS PHR encryption

The crypto is mathematically identical. The only reason Java is needed is X509 SPKI keyToShare encoding. This could be done in Node.js:
- Use `node:crypto.createPublicKey()` with the raw EC point to get a `KeyObject`
- Export as SPKI: `publicKey.export({ type: 'spki', format: 'der' }).toString('base64')`

This would eliminate the Java subprocess dependency entirely for the PHR path. The static keys are already configured via env vars — the TS `fidelius-crypto.ts` would need a small modification to accept a static private key instead of generating one.

---

## 9. Discussion notes

- The developer (kamal-iqline) added the Java subprocess as a "works on my machine" fallback — the HTTP sidecar is the intended production path
- The PHR sandbox is an NHA-mandated receiver that uses mgrmtech/fidelius — we don't control its protocol
- The `isPhrSandboxDataPushUrl` + static keys + canonical key material pattern is designed to be extensible: adding a new receiver type in the future (e.g., `isProdPhrPushUrl`) would follow the same pattern
- The Java test vectors in `tools/fidelius-java-vector/` serve double duty: (a) verify TS crypto matches Java BouncyCastle output, (b) provide Java sources used by the subprocess fallback

---

## 10. Test coverage assessment

| Area | Tests | Status |
|---|---|---|
| `fidelius-crypto.ts` | `fidelius-crypto.test.ts` — encrypt/decrypt round-trip | ✅ |
| BC curve25519 vectors | `fidelius-bc-vector.test.ts` — NHA spec 65-byte key vector | ✅ |
| Java vector matching | `fidelius-java-vector.test.ts` — ciphertext matches Java output | ✅ |
| `fidelius-phr-encrypt.ts` (orchestrator) | **None** — chain-fallback logic untested | ❌ |
| `fidelius-http.client.ts` | No unit test (requires sidecar) | ❌ (acceptable) |
| `fidelius-cli-subprocess.ts` | No unit test (requires binary) | ❌ (acceptable) |
| `fidelius-java-subprocess.ts` | No unit test (requires JDK) | ❌ (acceptable) |
| `is-phr-sandbox-push.ts` | `is-phr-sandbox-push.test.ts` — basic URL checks | ✅ |
| `extract-consent-care-context-refs.ts` | `extract-consent-care-context-refs.test.ts` — M3 + consent artefacts | ✅ |
| `parse-hi-request-body.ts` | `parse-hi-request-body.test.ts` — covers PHR + normal | ✅ |
| `resolve-hip-data-push-url.ts` | `resolve-hip-data-push-url.test.ts` — covers PHR bypass | ✅ |
| `hip-data-push.client.ts` | `hip-data-push.client.test.ts` — allowlist + PHR header omit | ✅ |
| `m3-fidelius-roundtrip.test.ts` | Full M3 round-trip test (keygen → encrypt → decrypt) | ✅ |

Missing: **orchestrator** (`fidelius-phr-encrypt.ts`) — should at minimum test that HTTP path is preferred over CLI, and that errors propagate correctly.

---

## 11. Worktree reference

```
Path: /home/ayushiqline/projects/draft/The-HIMS-pr140
Branch: master-data-code (head of PR)
Base: dev
Created: git worktree add ../The-HIMS-pr140 master-data-code
```
