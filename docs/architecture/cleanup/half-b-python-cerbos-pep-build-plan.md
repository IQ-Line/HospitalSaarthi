# Half B — Python Cerbos PEP for opd + master-data (build plan)

> **Task #51 Half B.** Full per-module in-process authz for the two Python/FastAPI modules
> (**opd**, **master-data**): in-process JWT verification (JWKS/RS256) + per-resource Cerbos
> authorization, mirroring the TS `@hims/ts-sdk-authz` PEP. **Scope confirmed by the user 2026-07-01
> (Option B — the full Cerbos PEP, not just close-the-bypass).**
>
> **Status:** planned, not started. Ground truth gathered 2026-07-01 (two read-only mapping agents +
> Context7 for the canonical Python clients). Half A (#48-M3 `is_system`) is already done (`4eeb53cd`).
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
