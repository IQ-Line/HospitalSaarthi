# ABDM Adapter — M3 Doc Vetting Notes

> Audit of production HIMS (`hims/abdi-lims-backed`) M3 implementation against the spec. Findings are bugs / divergences / patterns you should NOT replicate when building the new M3 module. Cross-checked against ABDM v3 spec §4 and §5.

This is the M3 companion to the implicit M2 vetting (which was captured inline in `06-m2-dev-guide.md §11.1`). For M3, the volume of divergence justified a separate file.

Production HIMS has ABDM certification, so some patterns ARE worth copying — see §"What's worth copying" at the bottom. But every architectural pattern must be cross-checked against the spec doc before adopting.

## Findings — DO NOT replicate

### Crypto / security

| # | Where | Bug | Severity | What to do |
|---|---|---|---|---|
| 1 | `src/services/milestone3Service.ts:614-622` | **HIU keypair is hardcoded per environment.** `keyValue` and `nonce` come from `constants.ts` (`url.keyValue`, `url.nonce`) — fixed values reused across every consent's data request. Anyone with the static private key can decrypt every transfer. | **Critical** | Generate ephemeral ECDH keypair + 32-byte nonce per data-request flow via `fidelius-curve25519-bc.ts` (`generateKeyPair`); persist encrypted private key in `abdm_m3_data_transfers.hiu_private_key_jwk`; use once. New session = new keypair. See [`08-m3-flows.md §2 crypto cheat sheet`](./08-m3-flows.md#crypto-cheat-sheet--hiu-side). |
| 2 | `src/services/milestone3Service.ts:618` | Hardcoded 24h key expiry — `Date.now() + 24 * 60 * 60 * 1000`. Spec allows variable expiry per HIU; production never reads it. | **Medium** | Read expiry from session config; default 24h is fine but make it env-driven (`ABDM_M3_KEYPAIR_TTL_HOURS`). |

### Data model

| # | Where | Bug | Severity | What to do |
|---|---|---|---|---|
| 3 | `src/models/M3Session.ts:130-140` | Mixed deprecated + new fields kept "for backward compatibility": `consentArtefact`, `consentArtifactId`, `consentMetaData`, `hipId`, `dataPushed`. New code reads `consentArtifacts[]`; old reads the singular versions. Schema-less Mongo lets this rot accumulate. | **High** | New M3 module uses `abdm_m3_consent_requests` + `abdm_m3_consent_artefacts_hiu` + `abdm_m3_data_transfers`. Three tables, no deprecated columns, no backward-compat shims. If a field needs to change shape, do a migration; don't keep both. |
| 4 | `src/models/M3Session.ts:169-238` | `post(['find', 'findOne', 'findOneAndUpdate'])` hook does **data erasure inside a read query**. When `dataEraseAt < now()`, the read clears `dataPushed` and updates the DB. Side effects in read hooks: read traffic surprises with writes; "fire and forget" promise rejection only logs; if the write fails the read still succeeds with stale-but-cleared data. | **High** | Run a real janitor — see [`09-m3-dev-guide.md §4.3`](./09-m3-dev-guide.md#43-abdm-m3-data-transfersrepots-new) `ix_m3_transfers_awaiting` index + a periodic worker that DELETEs expired bundle data. Read hooks must be side-effect-free. |
| 5 | `src/models/M3Session.ts:65-67` | `consentMetaData: { type: Object }`, `careContexts: { type: [Object] }` — typed-as-Object JSON blobs with no shape validation. Query power lost, drift not caught at write-time. | **Medium** | New tables use `jsonb` for the full artefact body verbatim, but **indexed scalar columns** for `consent_id`, `patient_abha_address`, `hip_id`, `status`, `data_erase_at`. Mongo "everything is Object" doesn't translate. |
| 6 | `src/models/M3Session.ts:158` | Unique compound index `({ 'iq-tenant-id': 1, sessionId: 1 })` exists, but the `consentArtifactSchema` has no tenant-scoped uniqueness on `consentArtifactId`. Two concurrent flows for the same patient could create duplicate artefact rows. | **Medium** | New `abdm_m3_consent_artefacts_hiu` PK is `(iq_tenant_id, consent_id)` — uniqueness enforced at DB level. |
| 7 | `src/models/M3Session.ts:186` | Comment in the read hook: `if (!artifact) return; // strange bug where some entries become null`. Defensive code around a Mongo quirk that's never been root-caused. The "strange bug" is likely tenant-isolation contamination from another flow's writes. | **Medium** | Postgres + Citus distribution by `iq_tenant_id` eliminates this class of issue. No defensive null checks needed in the new code. |
| 8 | `src/models/M3Session.ts:1-5` | Imports `@hapi/joi`, `console.timeStamp`, `mongoose`, `sequelize`'s `JSONB` — three different DB libraries and an unused logging import. Suggests the team intended JOI validation but never wired it. | **Low** | One DB layer (Drizzle), Zod or AJV validation at the route boundary; no orphan imports. |

### M3-specific protocol bugs

| # | Where | Bug | Severity | What to do |
|---|---|---|---|---|
| 9 | `src/services/milestone3Service.ts:648` | `"transactionId": consentId.txnId` — typo: `consentId` is a string from `req.body`, not an object. `.txnId` is always `undefined`. The data-flow notify body always lands with `transactionId: undefined`; CM either silently accepts or rejects with a useless error. | **High** | Pull `transactionId` from `abdm_m3_data_transfers.cm_transaction_id` (we stored it when the on-request callback arrived during the `DATA_REQUESTED → AWAITING_PUSH` transition). Don't dereference scalars as objects. |
| 10 | `src/services/milestone3Service.ts:651` | `notifier.type` hardcoded to `"HIU"` in `DataFlowNotificationService`, but the method is called from the HIP side per the comment "Note: Documentation says HIP ID only at position 11 for DataFlowNotificationService". Type/role mismatch — the wrong notifier type goes to CM. | **High** | New code has **two separate use-cases** under separate flow kinds: HIU notify lives in the `abdm.m3.hiu.v1` flow (`use-cases/m3/hiu/notify-cm-received.ts`, notifier.type=HIU); HIP notify is `use-cases/m3/hip/notify-data-transfer.ts` already on branch (notifier.type=HIP). Don't share one function across both roles. |
| 11 | `src/services/milestone3Service.ts:603-626` | `gatewayService.callABHAService(...)` invoked with 12+ positional args. The header set (X-CM-ID, X-HIU-ID, etc.) is determined by argument position. Comment on line 643: "HIP ID only at position 11" — calls out the brittleness without fixing it. | **High** | New `gateway-client.http.ts` uses **named-object parameters** (`postDataRequest({ requestId, body })`). Per-endpoint methods know their own header set; no positional ambiguity. |
| 12 | `src/services/milestone3Service.ts:613` | `dataPushUrl` uses defensive double-slash regex: `.replace(/([^:]\/)\/+/g, '$1')`. Indicates `BASE_URL`/`url.dataPushUrl` are inconsistently slashed. Defensive code instead of fixing the root cause. | **Low** | Construct URLs with `new URL(path, baseUrl)` — no regex needed. |
| 13 | `src/services/milestone3Service.ts:574, 96-104, 165, 187-196, 628` | Verbose `console.log` of full requests, queries, sample results — including patient names, ABHA addresses, MongoDB query bodies. **Logs PHI.** | **High** | Use the platform's structured logger (`session-audit-log.ts`); redact PII before logging. Never `console.log(query)` when query has user-supplied search terms. |
| 14 | `src/services/milestone3Service.ts:111-115` | `name?.length` check passes through to `query.$or = [{ 'identifiers.name': { $regex: name } }]` without sanitization. **Mongo regex injection** — user-supplied `name` is interpreted as a regex pattern. `name = ".*"` returns every patient; `name = "(.*){50,}"` ReDoS. | **Critical** | Escape regex metacharacters or use `$text` index. New module uses prepared queries; pgmustache/Drizzle parameterizes. |

### Routing / API surface

| # | Where | Bug | Severity | What to do |
|---|---|---|---|---|
| 15 | `src/routes/milestone3.ts:148-159` | `GET /consents` route invokes `DataFlowNotificationController` — copy-paste bug. The route returns notification ack output where it should return a consent list. Anyone calling this gets the wrong response. | **High** | Each route maps to one controller; lint rule + test-per-route catches this. |
| 16 | `src/routes/milestone3.ts:94` | `exception?.errrs?.[0]?.message` — typo: `errrs` (three r's). Always-undefined; falls through to `\|\| exception` which returns the whole exception object. Error messages never reach the client correctly. | **Medium** | TypeScript strict mode + a shared error-response helper catch this. Don't write defensive optional-chain ladders. |
| 17 | `src/routes/milestone3.ts:9-12` | No input validation on any route. `req as any` discards type info. `protectedTenantMiddleware` covers tenant but not body shape. | **High** | Zod schemas on every route's `req.body` and `req.params`; `req.body` strict type from inferred schema. |
| 18 | `src/services/milestone3Service.ts:23-43` | `mapHiTypesToBundleTypes` includes `Invoice` — removed from M3 spec but mapping persists. Dead mapping leaks into runtime behaviour. | **Low** | Match the canonical 7-type list from `packages/ts-sdk-abha/protocol/m3/common.ts` `HiTypePascal`. Don't add types the spec dropped. |
| 19 | `src/services/milestone3Service.ts:49-87` | `filterDataPushedEntries` — service-layer filtering of which FHIR bundle entries to return based on `hiTypes.length === 8` magic number ("all 8 hiTypes requested"). UI-shaping logic inside the service. | **Medium** | Filtering belongs at the GET endpoint, parameterized by the caller. The service returns the full artefact; the BFF / frontend filters. Cohesion. |

### Documentation / commenting

| # | Where | Bug | Severity | What to do |
|---|---|---|---|---|
| 20 | `src/services/milestone3Service.ts:607` | Inline comment `// yes they meant consent artifact` next to `"id": consentArtifactId`. Indicates uncertainty about which ID field to use. Sandbox ambiguity captured as a code comment instead of resolved against spec. | **Low** | Spec §5.3.1 calls it `consent.id` (no "artefact"). Use the canonical name; add a §X.Y.Z citation comment. |

## What's worth copying

Production HIMS has earned ABDM certification, so some patterns work in practice even when the implementation is rough. These are worth borrowing for the new module:

| Pattern | Where | Why it's worth keeping |
|---|---|---|
| **HI type → bundle type mapping** | `milestone3Service.ts:23-43` | The mapping itself (minus `Invoice`) is correct and useful. Adapt as `packages/ts-sdk-abha/src/lib/hi-type-bundle-mapping.ts` with the 7 spec types. |
| **`on-fetch` artefact body parsing** | `callbackService.ts` (search for `consent/on-fetch`) | Sandbox-validated parsing of the artefact's wrapper + signature shape. The exact field paths (`consent.consentDetail.consentId` etc.) are battle-tested. |
| **Gateway error code catalogue** | `constants.ts` + scattered `try/catch` blocks | Real-observed error codes (`ABDM-1080` invalid artefact id, `ABDM-1092` expired consent) — extend `packages/ts-sdk-abha/src/constants/error-codes.ts` with these. |
| **`dataPushUrl` callback path pattern** | `routes/callback.ts:283` `router.post('/pushDataUrl/:tenantId')` | The idea of tenant-keyed URL path is sound; we improve by keying on `transferId` instead (uniqueness + no extra lookup). |
| **Multi-HIP fan-out modelling** | `M3Session.ts:60-88` `consentArtifactSchema` array | The recognition that one consent request → N artefacts (one per HIP) is correct. We adopt this as `abdm_m3_consent_requests.consent_artefact_ids text[]` + per-artefact rows. |
| **Data erasure on `dataEraseAt`** | `M3Session.ts:174-181` (concept, not implementation) | The requirement to purge `bundle_json` after the artefact's `dataEraseAt` is real and spec-mandated. Implement properly as a janitor job, not a read-hook side effect. |

## How to use this document

- **Before copying a function** from production HIMS, search this file for the function name. If it's flagged, read the "What to do" column.
- **Before writing a new function** that mirrors production HIMS behaviour, search for the file/lines it lives in. The pattern may be tagged here as something to redesign.
- **Add findings as you discover them** during M3 implementation. The right time to flag a divergence is when you encounter it — before it gets copied.
- **Severity guide:**
  - **Critical** = security or data integrity bug; ship-blocking.
  - **High** = correctness bug affecting normal operation.
  - **Medium** = pattern that scales badly or makes debugging harder.
  - **Low** = code smell / minor inconsistency.

## Related

- [08-m3-flows.md](./08-m3-flows.md) — what M3 should look like
- [09-m3-dev-guide.md](./09-m3-dev-guide.md) — how to implement it
- [10-m3-mock-harness-guide.md](./10-m3-mock-harness-guide.md) — how to test it locally
- M2 equivalent (inline) — [`06-m2-dev-guide.md §11.1`](./06-m2-dev-guide.md#111-production-reference-caveats--dont-copy-himsabdi-lims-backed-blindly) — three M2 bugs caught during M2 vetting
- Production reference: `/home/ayushiqline/projects/hims/abdi-lims-backed/src/{services/milestone3Service.ts, services/callbackService.ts, routes/milestone3.ts, models/M3Session.ts}`
