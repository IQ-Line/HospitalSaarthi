# Half B — Python Cerbos PEP for opd + master-data (build plan)

> **Task #51 Half B.** Full per-module in-process authz for the two Python/FastAPI modules
> (**opd**, **master-data**): in-process JWT verification (JWKS/RS256) + per-resource Cerbos
> authorization, mirroring the TS `@hims/ts-sdk-authz` PEP. **Scope confirmed by the user 2026-07-01
> (Option B — the full Cerbos PEP, not just close-the-bypass).**
>
> **Status:** Phase 0–3 DONE (2026-07-01). §8 Phase-0 confirmations; §9 Phase-1 (`hims_authz`, 53
> tests, adversarially reviewed); Phase 2 = opd policies + `045_opd_authorization_catalog.py` seeds
> (15 `cerbos compile` tests green); Phase 3 = opd-svc PEP wired — `IdentityGateMiddleware` +
> per-route `guard(kind, action)` on all 18 non-health routes, tenant/doctor now from the VERIFIED
> principal (`SYSTEM_DOCTOR_ID` all-zeros header-trust REMOVED), `create_app` builds/injects `Authz`
> (deps seam for tests). opd 86 pytest green (82 adapted via a `tenant_headers`→minted-JWT seam that
> preserves tenant isolation + 4 new authz tests), ruff clean; **live round-trip vs real Cerbos 5/5
> correct** (allow-with-cap / deny-no-cap / deny-cross-tenant / finalize-gates-on-update). Half A
> (#48-M3) done (`4eeb53cd`). **Phase 4a DONE** — master-data Cerbos policies
(`infra/cerbos/policies/master_data/{module,permission,system_role,module_permission,department}.yaml`
+ `master_data_permissions_test.yaml` [20 tests green, 95 total] + alembic
`046_master_data_authorization_catalog.py` seeding `master-data:{module,permission,system-role,
module-permission,department}:{create,update,delete}`). **Phase 4b DONE (2026-07-02)** — master-data
create_app PEP wired: `create_app(deps)` builds/injects `Authz`, sets `app.state.authz`, adds
`IdentityGateMiddleware` (public = `{api_prefix}/health` only; `BearerAuthContextMiddleware` unwired —
file deleted in Phase 5), lifespan `assert_reachable`/`aclose`; `AuthEnvSettings` added. Two guards in
`app/core/authz.py`: `guard(kind, action)` (global catalogs, `resource_attr={}`) + scope-aware
`department_guard(action)` (`resource_attr={"iq_tenant_id": scope tenant}`). All 5 catalog write routes
(POST/PATCH/DELETE + department import) carry a guard; `actor_id=None` → verified JWT `sub` via
`resolve_actor_id`; reads identity-gate-only by design. Test seam: conftest RS256 stub-PEP
(`test_authz`/`denying_authz`/`recording_deny_authz`/`auth_headers`/`forged_auth_headers`/`actor_sub`);
per-file client fixtures rewired to `create_app(deps=…)` + bearer. **152 pytest green**, ruff clean;
**live round-trip vs real Cerbos 11/11** (global cap allow/deny, hyphen-cap↔underscore-kind, department
tenant-eq/cross-tenant/super-admin/global-scope). **Adversarial review (2 agents):** the 5-catalog PEP
is fail-closed (no bypass found); 4 mutation-proved test gaps CLOSED (every write verb guard-proven,
actor-id value asserted, department scope-attr observed, forged-token 401).
>
> **Residual (defer-with-a-gate):** the **13 visitpad catalogs (36 write routes)** are now
> authenticated (identity gate — the unauthenticated bypass IS closed) but NOT yet capability/tenant
> gated; their pre-existing `master_data_visitpad.yaml` policy is capability-only (no tenant-eq), so
> closing the authenticated-cross-tenant gap needs a tenant-isolated policy + verified `visitpad-*` cap
> seeds + a scope guard on 36 routes + tests. Tracked as **Phase 4c** (recoverable failure mode:
> authenticated-but-coarse; gate: NetworkPolicy edge-only in Phase 5 + this note). Picklist writes same
> status. **Note:** `guard`/`build_authz` duplicate opd's (~15 lines); consolidate into `hims_authz`
> when a 3rd Python module appears (not now). Phase-5 dead-code sweep MUST delete the unsigned-JWT
> `auth_policy.resolve_superadmin_actor` landmine (`verify_signature=False` when `jwt_secret` unset).
> Constraints unchanged: dev pinned `12963b72`; never push; explicit-path stage; never the 14 not-ours
> untracked; commit trailer `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.

---

## 0. What "done" means

opd-svc and the master-data service each: (a) **verify the caller's JWT in-process** (RS256 against the
edge JWKS — a direct-to-service caller can no longer reach them with a spoofed/absent identity);
(b) **enforce tenant-scope** against the verified principal (not a spoofable header); (c) **call Cerbos
per resource-action** with the same principal-attr contract the TS modules use, gated by capabilities.
Plus: master-data catalog writes stop being unauthenticated; opd's `SYSTEM_DOCTOR_ID` all-zeros fallback
is removed; a NetworkPolicy makes both services edge-only; the dead `core/security.py` + HS256 auth
scaffold is removed. This closes #51 end-to-end with **no strings left hanging**.

**Non-goals:** re-architecting the TS side; changing the JWT claim set; changing better-auth.

---

## 1. Canonical tooling (verified — do NOT hand-roll)

- **AuthN (verify):** PyJWT `PyJWKClient(JWKS_URL)` → `get_signing_key_from_jwt(token)` →
  `jwt.decode(token, key, algorithms=["RS256"], audience=JWT_AUDIENCE, issuer=JWT_ISSUER, leeway=60)`.
  PyJWKClient has built-in per-`kid` caching + auto-refresh on unknown kid. PyJWT is **already a
  dependency** of both opd and master-data. Enforce `maxTokenAge≈300s` via an explicit `iat` check
  (PyJWT has no `max_age`, unlike jose) and require claims `sub, iq_tenant_id, roles, jti, exp, iat`.
- **AuthZ (PDP):** the official **`cerbos` Python SDK (`cerbos>=0.3.0`)** — `Principal`, `Resource`,
  `ResourceAction`, `ResourceList` from `cerbos.sdk.model`; client from `cerbos.sdk.client`. **Use the
  ASYNC HTTP client** (FastAPI handlers are async; the sync client would block the event loop). Cerbos
  serves HTTP on **:3592** and gRPC on **:3593** from the same instance — the TS side uses gRPC :3593;
  Python uses **HTTP :3592** (same PDP, same policies). Confirm the exact async import path at execution
  (`cerbos.sdk.client` sync vs an async variant — the package ships both; verify against the installed
  `cerbos` version's API).

---

## 2. The contract to mirror (exact values — Python must match these)

### 2.1 JWT / JWKS (from `ts-sdk-identity` + better-auth)
- **Algorithm** RS256 (2048-bit). **JWKS endpoint** = `${JWT_ISSUER}/api/auth/.well-known/jwks.json`
  (served by user-management-svc / better-auth). Invariant: `JWKS_URL == JWT_ISSUER + that path`.
- **Env contract (new for both Python services):** `JWKS_URL`, `JWT_ISSUER`, `JWT_AUDIENCE`, `CERBOS_URL`.
  Dev values: issuer `http://localhost:3000`, audience `hims-platform`, cerbos `grpc://localhost:3593`
  (→ Python wants the **HTTP** form `http://localhost:3592`; add a Python-appropriate var or normalize).
  k8s: issuer `https://hims.example.com`, cerbos `cerbos.himsv2.svc.cluster.local:3593` (→ `:3592` for HTTP).
- **Required claims:** `sub, iq_tenant_id, roles, jti, exp, iat`. `session_id`/`org_id`/`department` optional.
  `maxTokenAgeSeconds=300`, `clockSkew=60`.

### 2.2 Cerbos check shape (mirror `ts-sdk-authz` exactly)
- **Principal** `{ id, roles, attr }` where `attr` = **exactly**:
  `iq_tenant_id, org_id, department, role_codes, capabilities, delegated_capabilities, clearances,
  um_clearance_effective_tier`. (Existing policies read these attribute names; new opd/master-data
  policies sit alongside them and must use the same names.) `roles` falls back to
  `["__hims_authenticated__"]` when empty.
- **Resource** `{ kind, id, attr: { iq_tenant_id, ... } }`. **actions** = `[action]` (array of one).
- **Policy rule pattern** (from `user_management/role.yaml`): tenant isolation =
  `request.principal.attr.iq_tenant_id == request.resource.attr.iq_tenant_id`; grant =
  `"<cap-key>" in request.principal.attr.capabilities || "<cap-key>" in request.principal.attr.delegated_capabilities`.
  Global/platform resources (like `master_data:visitpad`) omit the tenant equality and gate purely on
  capability; cross-tenant super-admin variants replace tenant-equality with
  `"super-admin" in request.principal.attr.role_codes`.

### 2.3 ⭐ Principal enrichment — THE crux decision (capabilities aren't in the JWT)
The JWT carries `roles` but **not** `capabilities`. The TS downstream services (billing/pharmacy/
registration) enrich by connecting **directly to the user-management DB** and reusing UM's Drizzle repos
(`DrizzlePrincipalAuthorizationRepository(umDb)` + `DrizzleCapabilityRepository(umDb)` →
`createDefaultPrincipalService` → `principalRoleEnricherPlugin` sets `request.cerbosPrincipal`).

**DECISION for Python: enrich HTTP-first, do NOT replicate UM's capability SQL in Python.** The Python
PEP forwards the verified bearer to **`GET {UM}/api/user-management/auth/principal`** (which returns the
same enriched Cerbos payload — capabilities, delegated, clearances, attrs) and caches it briefly
(short TTL, keyed by `jti`), then builds the Cerbos principal from it. Rationale:
- The TS direct-DB read is a cross-module DB coupling the TS side gets away with only because it reuses
  UM's *actual* code; Python can't, so mirroring it means re-implementing capability materialization +
  entitlement intersection in Python SQL — brittle, drift-prone, and the "reinvent it worse" anti-pattern
  the doctrine explicitly forbids in polyglot monorepos.
- HTTP-to-UM is **D8-aligned** (HTTP-first cross-module contract), keeps UM the single source of truth,
  and matches the #45/#49 cached-internal-call precedent.
- **Fail-closed** on enrichment failure (unlike #49's ban-check fail-open): no capabilities ⇒ deny. This
  makes UM a hard dependency for opd/master-data authz — acceptable (UM is foundational to identity).
- **Confirm at execution:** that `GET /auth/principal` is reusable S2S by forwarding the caller's bearer
  (it's a self-principal read, allowed for any authenticated user). If self-tenant pinning or auth-mode
  blocks reuse, add a narrow UM internal endpoint `GET /internal/principals/:userId/cerbos-payload`
  (`x-um-internal-key`-gated, identity-skip-prefixed — mirror #45) instead. Prefer reuse.

---

## 3. Architecture — `packages/py-sdk-authz` (import name `hims_authz`)

Rebuild the reverted scaffold clean (its `.py` sources are gone; only egg-info/.pyc/.venv detritus
remain — CLEAN those first, see Phase 0). Intended layout (recovered from `SOURCES.txt`/`PKG-INFO`):

```
packages/py-sdk-authz/
  pyproject.toml            # name hims_sdk_authz, import pkg hims_authz, py>=3.12, hatchling
  project.json              # nx: setup(uv sync)/lint(ruff)/test(pytest) — copy modules/opd/project.json
  src/hims_authz/
    __init__.py             # public exports
    types.py                # VerifiedPrincipal, CerbosPrincipal dataclasses (the attr contract §2.2)
    verify.py               # PyJWKClient RS256 verify → VerifiedPrincipal (§2.1)  [NEW vs SOURCES]
    enrichment.py           # HTTP-to-UM /auth/principal client + short-TTL cache (§2.3) [NEW]
    client.py               # async Cerbos SDK wrapper: check(kind,id,action,attr) -> bool
    dependency.py           # FastAPI deps: get_principal() (verify+enrich), require(kind,action,attr_fn)
    middleware.py           # optional ASGI: attach verified principal; 401 on protected paths
  tests/                    # real RS256/JWKS tokens, mocked UM /auth/principal, mocked/real Cerbos
```
- **Deps** (from recovered `requires.txt`): `cerbos>=0.3.0, fastapi>=0.115, httpx>=0.27, pydantic>=2,
  pyjwt>=2.8, starlette>=0.37`.
- **Consumption:** opd-svc + master-data add `hims_sdk_authz = { path = "../../packages/py-sdk-authz",
  editable = true }` under `[tool.uv.sources]` (mirror how opd consumes `hims_sdk_fhir`). py-sdk-authz is
  a package, not an nx *build* target dep — follow py-sdk-fhir's shape (has `project.json` for
  setup/lint/test, but modules depend on it via uv path source).
- **Design parity with TS:** `dependency.require(kind, action, attr_resolver)` mirrors the TS
  `resolveTarget` route→`{kind,id,action,attr}` map + `request.checkResource`. Keep a per-request memo
  (like the TS `DecisionCache`) if a handler checks twice. `assert_cerbos_reachable()` startup probe
  mirrors `cerbos-startup-probe.ts` (transport-failure-only fatal).

---

## 4. Phased execution (each phase = its own commit(s) + gate)

**Phase 0 — Prep + confirmations (no behavior change).**
- Clean the stale `packages/py-sdk-authz/` detritus (`.venv/ .ruff_cache/ .pytest_cache/
  src/hims_authz/__pycache__/ tests/__pycache__/`) — but FIRST record the intended deps from
  `src/hims_sdk_authz.egg-info/{PKG-INFO,requires.txt,top_level.txt,SOURCES.txt}`, THEN remove egg-info.
  (This is the [[reference_stale_src_artifacts_landmine]] pattern.)
- **Confirm the enrichment endpoint** (§2.3): is `GET /auth/principal` S2S-reusable with a forwarded
  bearer? Read its handler + the `auth.read` policy. Decide reuse vs new internal endpoint.
- **Confirm the async `cerbos` client** import path/API for the pinned version.
- Decide `CERBOS_URL` handling for Python (HTTP :3592 vs the TS gRPC :3593 form) — likely a normalizer or
  a distinct env var.

**Phase 1 — Build `packages/py-sdk-authz` (`hims_authz`) + its own tests.** JWKS verify (`verify.py`),
HTTP enrichment + cache (`enrichment.py`), async Cerbos wrapper (`client.py`), FastAPI deps
(`dependency.py`), types, `assert_cerbos_reachable`. **Gate:** package-level pytest with real RS256
keypair + a local JWKS doc + mocked UM `/auth/principal` + mocked-or-real Cerbos; ruff clean; the
package builds (`uv sync`). Mirror the sincerity of the BFF/ts-sdk-identity tests (real tokens, spoof
rejection, expiry, wrong-issuer/audience, missing-claim).

**Phase 2 — opd Cerbos policies + capability seeds.**
- Author `infra/cerbos/policies/opd/prescription.yaml` (+ `health_document.yaml`, and either fold
  clinical-document reads into `prescription`/`visit` or a small `clinical_document.yaml`). Resource
  kinds + actions from §5. Tenant-isolation condition (opd is tenant-scoped).
- Author the **capability keys** they gate on — NEW Master-Data catalog rows via an alembic seed
  migration (module/permission/module_permission → runtime `opd:prescription:{read,create,update,
  finalize,cancel,delete}`, `opd:health-document:{create,read}`). (Only `opd:visit:read`/`opd:patient:read`
  pre-exist as *demo* seeds.) Follow the existing seed-migration pattern; keep additive.
- **Gate:** `cerbos compile`/policy tests pass; the capability keys validate against the catalog.

**Phase 3 — Wire opd-svc.** Register (order matters, mirror UM main.ts): identity-verify → enrichment →
authz. Add an opd `resolveTarget`-equivalent route→`{kind,id,action,attr}` map (mirror
`authz-target-resolver.ts`). Replace `require_tenant_id`/`resolve_doctor_id` header-trust:
`iq_tenant_id`/doctor now come from the **verified principal**; **remove the `SYSTEM_DOCTOR_ID`
all-zeros fallback** (reject unauthenticated instead). Public: `GET /health` only. **Gate:** opd pytest
(the existing 82 + new authz tests: valid→allowed, missing/expired/wrong-aud→401, wrong-tenant→403,
missing-capability→403), ruff clean, `create_app()` boots, real round-trip against local Cerbos.

**Phase 4 — Wire master-data + policies.** Author policies + capability seeds for the five catalogs
(`modules, permissions, system_roles, module_permissions, departments`). **Handle dual-scope**
(`get_catalog_scope`): global (`master_global`, no `iq_tenant_id`) writes = platform-operator-only (no
tenant equality — model like `master_data:visitpad`); tenant (`master_tenant`) writes = `iq_tenant_id`
equality. Add identity+enrichment+authz to `master-data`'s `create_app` (it's its own service, no
wrapper dir — add as middleware/deps). **Wire the writes that are currently unauthenticated**; populate
`actor_id`/`created_by`/`updated_by` from the verified `sub`. **Gate:** master-data pytest (existing 113
+ new authz tests incl. global-vs-tenant), ruff clean, boot.

**Phase 5 — Boundary + cleanup + docs.**
- **NetworkPolicy** (`infra/k8s/`) making opd-svc + master-data reachable **only** via the edge (the
  deployment half of the #51 gate). Deny-by-default ingress except from the BFF/ingress.
- **Delete dead code:** master-data `app/core/security.py` (hardcoded `platform-admin` principal, zero
  usages), and the HS256/unsigned `auth_policy.py` scaffold now superseded by real RS256 verify (or
  repoint `require_superadmin` onto the new verify — decide during Phase 4). Remove the passthrough
  `BearerAuthContextMiddleware` if fully replaced.
- Update `authz-assessment.md §Resolution` (Half B DONE), master-map session log, memory. Retire the
  pre-prod gate's "in-process PDP" clause (now satisfied); keep the NetworkPolicy clause as an
  ops-verification item.

---

## 5. Resource · action surface (policy modeling targets)

**opd** (prefix `/api/v1/opd`), tenant-scoped:
- `opd:prescription` — `read` (GET list / by-visit / by-visits / by-id), `create` (POST), `update`
  (PUT), `finalize` (POST /finalize), `cancel` (POST /cancel), `delete` (DELETE).
- `opd:health_document` — `create` (POST upload), `read` (GET list / download).
- `opd:clinical_document` — `read` (the 6 report renders under `/visits/{id}/documents/*`); or fold into
  `opd:prescription:read`.
- `GET /health` stays public. (No "nurse pre-consult" route exists anymore.)

**master-data** (prefix `/api/v1/master-data`), **dual-scope** per `get_catalog_scope`:
- `master_data:module`, `master_data:permission`, `master_data:system_role`,
  `master_data:module_permission`, `master_data:department` — each `read/create/update/delete`
  (departments also `import` for `/import-from-platform`). Global catalogs (modules/permissions/
  system_roles/module_permissions) are platform-operator-authored → global-write policies gate on the
  operator/capability without tenant equality; tenant-scoped writes (departments in `master_tenant`)
  gate on `iq_tenant_id` equality. `picklists`/`meta`/`health` and the visitpad family are out of scope
  (visitpad already has `master_data:visitpad`).

**Capability keys:** essentially all NEW — must be seeded into the Master-Data catalog (only
`opd:visit:read`/`opd:patient:read` pre-exist, as demo seeds). Author them alongside the policies so the
policy literals and the catalog stay in lockstep.

---

## 6. Doctrine guardrails (hold these during the build)

- **Mirror, don't reinvent.** The Cerbos wire shape, principal-attr names, policy rule pattern, env
  contract, and plugin order all come from the TS side — match them exactly so policies are consistent
  cross-language. The ONE deliberate divergence is enrichment-via-HTTP (§2.3), justified above.
- **Simplest policies that do the job.** One resource-kind per real resource, capability-gated tenant
  isolation — no derivedRoles/exportVariables (consistent with the existing 13 policies).
- **Async, don't block.** Async Cerbos HTTP client + async httpx for enrichment; cache to avoid a per-
  request UM round-trip storm.
- **Fail-closed on authz** (deny when Cerbos unreachable or enrichment fails) — opposite of #49's ban
  fail-open; authorization must not fail open.
- **Sincere tests, verify against reality.** Real RS256/JWKS tokens; real Cerbos where feasible (local
  compose on :3592); prove spoof/expiry/wrong-tenant/missing-capability all deny; prove the happy path
  allows. No header-trust left in either module.
- **Adversarial equilibrium.** Run an independent adversarial review (workflow) on the py-sdk-authz
  package and on each module's wiring before committing — the enrichment/cache + fail-closed + tenant
  resolution are exactly where subtle holes hide (cf. the #49 fail-open-caching bug an adversary caught).
- **Additive seeds; dev/DB disposable** (pre-prod) — capability-key seed migrations are additive; no
  backfill needed.

## 7. Risks / gotchas

- **Enrichment availability** — UM becomes a hard dependency for opd/master-data authz (fail-closed).
  Mitigate with the short-TTL cache; accept the coupling (UM is foundational).
- **Cerbos version drift** — compose `0.53.0`, bake Dockerfile `0.42.0`, k8s `dev-latest`. The check API
  is stable across these; note it but don't chase it in this task.
- **Async `cerbos` client API** — confirm the exact async import for the pinned version at Phase 0.
- **master-data dual-scope** — the same route is global or tenant by header; policies + tenant-resolution
  must branch on scope. This is the subtlest policy-modeling part.
- **opd `SYSTEM_DOCTOR_ID`** — removing the all-zeros fallback is a behavior change (unauthenticated →
  401); confirm no internal/system caller relies on it (grep) before removing.
- **`/auth/principal` S2S reuse** — if it can't be reused with a forwarded bearer, a narrow UM internal
  endpoint is needed (small UM addition; mirror #45's identity-skip + `x-um-internal-key`).

---

## 8. Phase 0 — DONE (findings, 2026-07-01)

All four Phase-0 confirmations resolved against ground truth (codebase + installed cerbos 0.15.1 + the
recovered prior scaffold). **No blockers; Phase 1 can proceed exactly as planned.**

### 8.1 ⭐ Prior art EXISTS — recovered, adversarially evaluated (this reshapes Phase 1)
`packages/py-sdk-authz` was **never abandoned-empty** — it was fully built + committed on the abandoned
authz branches `feat/authz-level-3b` / `fix/authz-corrections` (tip `a4cf4724`), the "#135–#149 reusable
as reference" branches. Recovered sources (`client.py 49 · dependency.py 65 · middleware.py 126 ·
types.py 40 · test_client.py 165` + `pyproject/project.json/uv.lock`) to scratchpad and evaluated.

**Verdict: reference-grade for the wire shape, but FAILS OPEN — must NOT be adopted as-is.** The reasons
it was left "reference only":
- 🔴 **No real JWT verification.** `middleware._decode_jwt_fallback` does `jwt.decode(token,
  options={"verify_signature": False})` (or HS256 with a shared secret) — a direct-to-service attacker
  forges any `sub`/`iq_tenant_id`/`roles` and it is accepted. Platform is RS256/JWKS. **This is the exact
  #51 bypass, left wide open.**
- 🔴 **Enrichment failure → falls back to the unsigned decode** (fail-OPEN). Our §2.3 mandates fail-CLOSED.
- 🔴 **`require_authz` defaults `authz_enabled` to `False`** — a missing/misconfigured state silently
  disables authz.
- 🟠 Sync `CerbosClient` inside async handlers (blocks the loop); a fresh client per check; `_default_
  cerbos_url` points at `:3593` (gRPC) with the HTTP client; `_auto_infer_id` path-param heuristic (no
  explicit route→target map, no dual-scope handling); `types.py` covers only master-data kinds, and its
  `EnrichedPrincipal` **drops `clearances` / `um_clearance_effective_tier` / `tenant_entitlement_revision`.**

**What to LIFT (correct, in-house precedent):** the Cerbos wire shape in `client.py` (`Principal/Resource/
ResourceAction/ResourceList`, the FIXED `resp.get_resource(id).is_allowed(action)` idiom), and the
`GET /auth/principal` → principal mapping in `middleware._resolve_principal` (the prior author
independently arrived at our §2.3 HTTP-first enrichment — strong validation). **What to REBUILD:** the
whole security envelope — real RS256/JWKS `verify.py`, fail-CLOSED enrichment, async client, explicit
route→target map, full attr set. Net: it's "lift ~55 lines of correct wire/mapping, rebuild the
security-critical parts fail-closed."

### 8.2 `GET /auth/principal` — reusable S2S, exact contract locked
`modules/user-management/src/rest-handlers/auth-handlers.ts:51` — `authMode:"protected"` (forwarded bearer
is verified by um-svc's identity plugin), returns `request.cerbosPrincipal` (no recomputation);
`authz-target-resolver.ts:193` marks it `authSelf()` (any authenticated caller reads their OWN principal).
**⇒ Forward the verified bearer S2S → get that caller's enriched Cerbos payload. No new internal endpoint
needed.** Response body (`domain/types.ts:202` `Principal`): `{ id, roles[], attributes:{ iq_tenant_id,
department|null, org_id|null, role_codes[], capabilities[], delegated_capabilities[],
clearances:Record<string,string>, um_clearance_effective_tier:number, tenant_entitlement_revision? } }`.
On a caller with no enrichment → 500 `CERBOS_PRINCIPAL_UNAVAILABLE` (treat as fail-closed deny).

### 8.3 Async cerbos client — exact API (installed 0.15.1 = ground truth)
`cerbos/sdk/client.py` exports `AsyncCerbosClient` (from `cerbos.sdk._async._http`, **httpx.AsyncClient**-
backed, HTTP :3592). Usage: `async with AsyncCerbosClient(host="http://…:3592", timeout_secs=2.0,
raise_on_error=True) as c: await c.is_allowed(action, principal, resource)` — a single-resource async
`is_allowed(action, principal, resource) -> bool` exists (simplest PEP path); `check_resources(principal,
resources: ResourceList) -> CheckResourcesResponse` for batch. Wire types `Principal/Resource/
ResourceAction/ResourceList` from `cerbos.sdk.model` (unchanged). Reuse ONE client across requests
(create at startup, `is_allowed` per request, close on shutdown) — don't churn a client per check.
cerbos pins `0.15.1` (the branch uv.lock); opd + master-data currently depend on `fastapi/pyjwt/httpx`
but NOT cerbos (adding it via py-sdk-authz is additive).

### 8.4 CERBOS_HTTP_URL, env, gitignore
- **CERBOS_HTTP_URL** (new Python env), default `http://localhost:3592` — a distinct HTTP var, NOT a
  normalizer over the TS `grpc://…:3593` form (simpler, unambiguous). k8s: `http://cerbos.himsv2.svc.
  cluster.local:3592`.
- **Env recovered from egg-info:** deps `cerbos>=0.3.0, fastapi>=0.115, httpx>=0.27, pydantic>=2,
  pyjwt>=2.8, starlette>=0.37`; dist `hims_sdk_authz`, import pkg `hims_authz`.
- **gitignore:** root ignores `__pycache__/ *.pyc .venv/ .ruff_cache/` but **NOT** `*.egg-info/` or
  `.pytest_cache/` — add a package-local `packages/py-sdk-authz/.gitignore` for those, and always stage
  EXPLICIT source paths (never `git add packages/py-sdk-authz/`).
- **Detritus cleaned** (Phase 0): removed the stale `egg-info/ .pytest_cache/ src+tests __pycache__/`;
  **kept `.venv/` (cerbos 0.15.1 already installed) + `.ruff_cache/`** for fast WSL2 iteration. The dir now
  collapses to fully-gitignored, so new sources stage cleanly.

---

## 9. Phase 1 — DONE (`hims_authz` package built + reviewed, 2026-07-01)

Built `packages/py-sdk-authz` (import `hims_authz`) as **7 modules** — `types` (VerifiedIdentity /
CerbosPrincipal / AuthzSettings + fail-closed exceptions), `verify` (PyJWKClient RS256/JWKS,
full alg/kid/iss/aud/max-age/required-claim checks mirroring `verify.ts`), `enrichment` (HTTP-first
`/auth/principal` + `(user_id, jti)`-keyed TTL cache + id/tenant cross-check, **fail-closed**),
`client` (async `AsyncCerbosClient`, fail-closed on PDP outage + startup probe), `dependency`
(`Authz.require(kind, action, ...)` FastAPI guard, memoized on request.state), `middleware`
(fail-closed identity gate), `__init__` — plus **5 test files, 53 tests, ruff clean**. The recovered
prior scaffold was NOT adopted (it fails open 3 ways); its correct wire-shape + `/auth/principal`
mapping were re-derived into the fail-closed rebuild.

**Adversarial review (3 independent lenses) — verdict: no fail-open, contract matches byte-for-byte.**
- JWT-crypto lens: `verify.py` matches `verify.ts` check-for-check (stricter in places); real RS256 test crypto.
- Fail-open lens: the 3 prior holes are closed; core authn/enrichment/authz strictly fail-closed.
- Test-integrity + contract lens: tests sincere; Python Cerbos wire == TS `buildCerbosPrincipalWire`
  snapshot branch (verified at the UM producer that top-level `roles` == `attributes.role_codes`, so the
  role_codes merge is value-preserving). No attr key dropped/renamed.

**Findings applied (all fail-closed-safe hardening / coverage, none were "code is wrong"):**
F1 middleware now denies WebSocket handshakes on non-public paths (only `lifespan` fast-paths);
F2 `_is_public` rejects dot-segment paths (proxy/sub-app normalization defense);
F3 pinned `pyjwt>=2.10.0` (a list issuer is silently reject-all on <2.10);
+ added tests: JWKS key-resolution-failure→closed, `aud`-missing→reject, full 8-key attr-parity
assertion, enrichment body-validation (invalid-JSON / non-object / empty-id), middleware
prefix-boundary (`/healthz`→401) and gate-verify-failure (forged→401).

**Consumption (for Phase 3/4):** opd + master-data add
`hims_sdk_authz = { path = "../../packages/py-sdk-authz", editable = true }` under `[tool.uv.sources]`.
The B008-clean idiom is a module-level `guard = authz.require(kind, action)` then `Depends(guard)`.

---

## 10. Phase 4 design (master-data) — recon + decisions (2026-07-01)

**Structure (differs from opd):** master-data runs DIRECTLY — `modules/master-data/app/main.py:69`
`app = create_app()` at import; **no `services/master-data-svc` wrapper**; flat `app/*` layout (import
root `app.`). `create_app()` at `app/main.py:46` takes **NO `deps` param** (must add), sets no
`app.state.authz`, imports no `hims_authz`. Settings `app/core/config.py` (`MASTER_DATA_` prefix) has
auth SCAFFOLDING (`auth_disabled`/`jwt_secret` HS256/`auth_bypass`/`dev_bearer_token`) but NONE of
JWKS/issuer/audience/Cerbos/UM — add an `AuthEnvSettings` mirroring opd's.

**Dual-scope:** `get_catalog_scope(request)` (`app/api/deps.py:62`) is HEADER-driven per-request
(`iq_tenant_id`|`x-tenant-id` → `CatalogScope.iq_tenant_id`: `None`=global(`master_global`) /
UUID=tenant(`master_tenant`)). Scope is NOT per-route-fixed.

**Policy model (DECIDED — mirror `master_data_visitpad.yaml`: colon resource kind, `roles:["*"]`,
capability match, bare-verb grouped actions):**
- **Global catalogs** `master_data:{module,permission,system_role,module_permission}` — writes
  (`create`/`update`/`delete`) gated on capability ONLY, **no tenant-equality** (the write caps are
  platform-operator-scoped; same shape as visitpad).
- **`master_data:department`** (tenant catalog) — `create`/`update`/`delete`/`import` gated on
  capability + **tenant-equality** (`principal.iq_tenant_id == resource.iq_tenant_id`), `roles:["*"]`,
  PLUS a `roles:["super-admin"]` cross-tenant variant (no tenant-eq) — like opd/registration.
- **READS: identity-gate-only** (authenticated, NO capability guard). Rationale: catalog reads are
  config metadata needed for frontend nav (`GET /modules/nav`); gating them on a read cap risks
  breaking the SPA. The PRIMARY #51 gap is unauthenticated WRITES. (Read caps ARE seeded for catalog
  completeness / future gating, but no read guard is wired.)

**Capability keys (derivation-verified, module `master-data`):** permission slug →
`mapMasterDataPermissionToRuntimeCapability` key: `master-data.module.create`→`master-data:module:create`;
`master-data.system.role.create`→`master-data:system-role:create`;
`master-data.module.permission.create`→`master-data:module-permission:create`;
`master-data.department.create`→`master-data:department:create`. `import` is NOT a runtime action →
the import route gates on the department **create** cap. (`master-data` module row seeded by `027`.)

**Guard (scope-aware — differs from opd's principal-tenant default):** global-catalog guard
`resource_attr={}`; department guard `resource_attr={"iq_tenant_id": scope.iq_tenant_id or ""}` read
from `get_catalog_scope(request)` (so tenant-eq compares the SCOPE/header tenant vs the principal
tenant → cross-tenant writes deny). actor: handlers pass `actor_id=None` today → replace with the
verified `sub` via a `resolve_actor_id(request)` dep (services already thread `actor_id` →
`created_by`/`updated_by`).

**Phase 4b test-migration (the heavy part — needs fresh context):** 113 tests, PER-FILE client
fixtures each `create_app()` + `dependency_overrides` (repos pinned to a scope), scope via headers,
**NO bearer, NO shared token/authed-client fixture**. Seam: add a conftest test-authz + token helper
(like opd's), each per-file fixture → `create_app(deps={"authz": test_authz})` +
`TestClient(app, headers={bearer})`; update any `created_by is None` assertions (now = the token
`sub`). The autouse `_api_prefix_for_tests` sets `AUTH_BYPASS=false`.

**Phase 5 dead code (master-data):** `app/core/security.py` (hardcoded `platform-admin` principal,
zero callers), `app/middleware/auth_policy.py` (HS256/unsigned `resolve_superadmin_actor`),
`app/api/auth.py` `require_superadmin` (never `Depends`-wired), `app/middleware/auth_middleware.py`
`BearerAuthContextMiddleware` (never rejects). Plus config auth scaffolding.

**Split:** 4a = policies + capability-seed migration + `cerbos compile` tests (self-contained, like
Phase 2). 4b = `create_app` deps/middleware + config + scope-aware guards + actor_id + 113-test
migration (like Phase 3).
