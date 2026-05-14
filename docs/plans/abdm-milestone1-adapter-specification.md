# ABDM Milestone 1 — Adapter service specification (documentation only)

**Status:** Planning / specification — not an implementation checklist for code changes.  
**Normative inputs:**

- Postman: `Milestone_1_Postman_Collection_18_08_2025_postman_collection_d202ddf09a.json` (folder structure, headers, bodies, example responses).
- Integrator guide: `milestone1.md` (ABHA V3 APIs — session URLs, headers, encryption algorithm, enrolment and verification sections).

**Goal:** Define how a **new Node.js + Fastify** HIMS-owned **ABDM adapter** will implement **ABHA creation (Aadhaar enrolment)** and **ABHA verification**, with strict **session and token management**, **typed contracts**, and **positive + negative** tests mirroring Postman flows.

---

## 1. Scope from Postman collection (build vs skip vs later)

Top-level folders in the Milestone 1 collection:

| Postman folder | M1 adapter — initial build | Notes |
|----------------|----------------------------|--------|
| **ABDM Session and cert API** | **Yes — required** | Session token + public certificate for RSA encryption; prerequisite for almost all ABHA calls. |
| **ABHA enrolment via Aadhaar** | **Yes — Phase A (creation)** | Full chain: Send OTP → Create ABHA by verifying OTP → mobile update OTPs → email link → ABHA address suggestions → ABHA address → Get profile → Download card (exact steps per nested items in collection + `milestone1.md` §3). |
| **ABHA Enrolment via DL** | **No — skip** | Out of product scope for this milestone. |
| **ABHA Enrollment via Biometrics** | **No — skip** | Out of product scope for this milestone. |
| **ABHA Verification** | **Yes — Phase B (verification)** | Subfolders implemented per product UI (see §6); password and biometric branches excluded unless product re-opens. |
| **BENEFIT_APIS** | **Later — separate milestone** | Government / benefit linkage; not required for core “create + verify ABHA” UX. |
| **Forgot ABHA & Retrieval of Enrollment Number** | **Later — optional** | Recovery flows; track as M2 unless product mandates M1. |
| **ABHA Profile** | **Partial in M1** | **Reads** (profile, card, QR) aligned with post-enrolment / post-verify flows where collection already uses them; **mutations** (update mobile/email, deactivate, re-KYC, etc.) → separate slice with full OTP/password trees from collection. |
| **Scan and Share** | **Later** | QR / share flows; separate product decision. |

---

## 2. Session and token management (critical)

### 2.1 Two different “tokens” (do not conflate)

| Token / credential | Role | Typical use |
|--------------------|------|----------------|
| **Gateway `accessToken`** | From `POST …/hiecm/gateway/v3/sessions` with `clientId` / `clientSecret` / `grantType: client_credentials`. | `Authorization: Bearer` on **ABHA** APIs and **certificate** GET (per collection). |
| **Transaction / profile token (`X-token` or nested JWT)** | Returned after certain OTP verify or enrolment steps; Postman examples include **“X-token expired”** scenarios. | Profile GET, card download, and other **authenticated user context** calls — exact header name and shape **must be taken from each Postman request** (do not assume one global pattern). |

The adapter **must document per outbound route** which bearer / `X-token` / `txnId` fields are required, because mixing them causes the “smooth Postman” flow to break in production.

### 2.2 Gateway session TTL (“12 seconds” vs documentation)

- The Integrator guide sample in `milestone1.md` shows a session response including **`expiresIn`** (example value **1200** in the pasted JSON — interpret as **seconds per NHA contract**, i.e. **20 minutes** unless your live SBX response differs).
- **Operational rule:** At implementation time, **log and assert** the real `expiresIn` (and JWT `exp` if decoded for diagnostics only) from **your** `client_credentials` response in SBX and PROD. If you observe **~12 seconds** in practice, treat that as the **authoritative** TTL for that environment and size buffers accordingly.

### 2.3 Robust management strategy (recommended behaviour)

1. **Single in-memory credential result** for gateway session: `{ accessToken, refreshToken?, expiresAtWallClock, rawExpiresIn }`.
2. **Proactive refresh:** treat token as invalid at `expiresAt = issuedAt + expiresIn - safetyBuffer` where **safetyBuffer** is configurable (e.g. 60–120 seconds, or 10–20% of TTL if TTL is very short).
3. **Singleflight / mutex:** if the token is expired or missing, only **one** coroutine refreshes; others await the same promise (prevents stampedes under load).
4. **No client-side secrets:** `clientId` / `clientSecret` only on server (env / vault). Frontend never calls NHA directly.
5. **Per-request correlation:** generate or propagate `REQUEST-ID` (UUID) and fresh `TIMESTAMP` (ISO-8601) on **every** outbound call, per `milestone1.md`.
6. **401 / “token expired” handling:** on ABHA 401 or body message like `X-token expired`, invalidate the relevant token cache entry and **retry once** after refresh (only for **idempotent** GETs; never blindly retry OTP verify POSTs).

### 2.4 Certificate (public key) caching

- `GET …/profile/public/certificate` depends on a valid gateway `Bearer` token in the collection.
- Cache `publicKey` + `encryptionAlgorithm` with a **TTL** (e.g. 1 hour) and refresh on encryption failure or 401 from cert endpoint.

---

## 3. Encryption (Aadhaar / mobile / OTP / password)

Per `milestone1.md` §2.0:

1. Obtain public key from certificate API.
2. Encrypt sensitive `loginId` values using **RSA/ECB/OAEPWithSHA-1AndMGF1Padding** in **server code** (Node `crypto`); do not rely on external web encryptors in production.
3. Unit-test encrypt helper against NHA-published behaviour (golden vectors if available; otherwise SBX round-trip with non-production data).

---

## 4. Phase A — ABHA creation (Aadhaar enrolment) — flow and types

### 4.1 Ordered steps (align with Postman + §3 of `milestone1.md`)

Implement as a **state machine** keyed by `txnId` (and any additional ids returned by NHA):

1. **Send OTP** (`scope: abha-enrol`, `loginHint: aadhaar`, encrypted `loginId`, `otpSystem: aadhaar`) → returns `txnId` + user-facing message.
2. **Resend OTP** (same endpoint pattern as collection / doc) when product requires.
3. **Create ABHA by verifying OTP** — follow collection nested folders: invalid authMethod, invalid transaction id, invalid OTP, positive flow, invalid mobile, invalid access token (map each to **tests**).
4. **Mobile update** — Send OTP → Verify OTP (same negative matrix pattern in Postman).
5. **Email verification link** — if in M1 product scope.
6. **ABHA address suggestion** — invalid txnId, positive flow.
7. **ABHA address** — preferred flag, txnId, access token, positive flow.
8. **Get profile details** — invalid access token, invalid request ID, invalid timestamp, X-token expired, invalid X-token, positive flow (mirror collection for error mapping).
9. **Download ABHA card** — same class of auth errors as profile.

### 4.2 TypeScript interfaces (adapter layer)

Maintain **three layers** of types to avoid drift:

| Layer | Purpose |
|-------|---------|
| **NHA raw DTOs** | TypeScript interfaces matching **exact** JSON keys from Postman example responses (snake_case as in NHA). One file (or package) per domain: `abdm-nha-session.types.ts`, `abdm-nha-enrolment.types.ts`, etc. |
| **Internal state** | e.g. `EnrolmentContext { txnId, stage, createdAt, gatewayTokenRef }` — never expose raw NHA tokens to logs. |
| **HIMS public API** | OpenAPI-generated or hand-written types for **your** Fastify routes (stable, versioned shapes; error codes; no leaking of internal txn to other tenants). |

**Rule:** When Postman adds a field to a response, update NHA DTOs and add a test assertion.

---

## 5. Phase B — ABHA verification — flow and types

### 5.1 In scope (initial product parity)

Under folder **ABHA Verification**, implement (minimum):

| Flow | Postman path | Pattern |
|------|----------------|---------|
| ABHA number + **Aadhaar OTP** | `Verify Via ABHA Number -Using Aadhaar OTP` | `Send OTP` → `Verify OTP` + all nested negative cases in collection. |
| ABHA number + **ABHA OTP** | `Verify Via ABHA Number - Using ABHA OTP` | Same structure; different `loginHint` / `otpSystem` per integrator doc §7. |
| **Aadhaar** | `Verify via Aadhaar` | Follow doc §7.1 / 7.2 and Postman sub-requests (including nested `Verify OTP`). |
| **Mobile** | `Verify Via Mobile Number` | Includes `Verify OTP` and `Verify User` in collection — **order and dependencies must match Postman exactly** (read request `url` + `body` order from JSON). |

### 5.2 Explicitly out of scope (initial)

- `Verify Via ABHA Number - Using Password` — defer unless product adds UI.
- `Verify Via ABHA Number - Using Biometrics` — skip per product decision.
- Deep **Find ABHA** trees (`milestone1.md` §7.6) — only add if product extends beyond the four entry points.

Each flow gets the same **NHA DTO + HIMS DTO + state machine** treatment as Phase A.

---

## 6. ABHA Profile folder (M1 split)

- **Include in M1** where needed to complete a **happy path** after enrolment or verification: e.g. **get profile**, **download card**, **QR** if the same `X-token` chain is already used in enrolment Postman tree.
- **Defer** complex profile mutations (update mobile/email, delete/deactivate/reactivate, re-KYC) to a **follow-up spec** — each has long OTP/password subtrees in the collection and should not block the core create + verify milestone.

---

## 7. Environment and URL matrix (from `milestone1.md`)

Document in adapter README (when implemented):

- **Gateway session:** SBX vs PROD URLs (`milestone1.md` §1.0).
- **ABHA API base:** `https://abhasbx.abdm.gov.in/abha/api` (SBX) vs prod path in doc.
- **`X-CM-ID`:** `sbx` vs `abdm` (or values NHA assigns to your integrator).
- **PHR / ABHA address** special base URLs in doc (§Environment URLs note) — only when you implement those sections.

---

## 8. Testing strategy (positive + negative)

### 8.1 Source of truth for cases

Each **named** request under Postman (especially `positive flow`, `Invalid …`, `OTP EXPIRED`, `OTP MISMATCH`, `X-token expired`) maps to **one automated test** (or one table-driven row) with:

- Expected HTTP status from NHA (or HIMS adapter mapping).
- Expected stable HIMS error code / message for frontend.

### 8.2 Layers

| Layer | What to test |
|-------|----------------|
| **Unit** | Token refresh math (including very short TTL), singleflight, RSA encrypt, header builder (`REQUEST-ID`, `TIMESTAMP`, `X-CM-ID`). |
| **Contract** | OpenAPI for HIMS adapter matches handler responses; Spectral clean. |
| **Integration (SBX)** | Tagged tests with real credentials: one happy path per major flow; subset of negatives that SBX allows without harming production data. |
| **E2E (later)** | Browser → adapter → SBX with test patient data policy. |

### 8.3 Negative categories to cover (from collection patterns)

- Invalid / expired gateway `accessToken`.
- Invalid scope, `loginHint`, `loginId`, `authMethod`, `txnId`, OTP value.
- OTP expired / mismatch.
- `X-token` expired / invalid (profile and card routes).
- Invalid mobile / timestamp / request-id where Postman defines them.

---

## 9. Security and observability (non-functional)

- No PII or secrets in logs; mask Aadhaar / mobile / ABHA number in diagnostics.
- Rate-limit adapter’s **public** routes when exposed beyond internal mesh.
- Request timeout per outbound call; **no** unbounded retries on mutating endpoints.

---

## 10. Implementation order (when build starts — for reference only)

1. Spike: session POST → parse real `expiresIn` → cert GET → one encrypt → one enrolment `Send OTP` in SBX.  
2. Phase A end-to-end happy path + negative matrix from Postman for enrolment.  
3. Phase B four verification paths + negatives.  
4. HIMS OpenAPI v1 for adapter; then frontend (separate track).

---

## 11. References in repo

| Artifact | Path |
|----------|------|
| Postman collection | `Milestone_1_Postman_Collection_18_08_2025_postman_collection_d202ddf09a.json` |
| Integrator guide | `milestone1.md` |
