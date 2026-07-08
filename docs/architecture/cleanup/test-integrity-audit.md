# Test-integrity audit — dev--improved-v1 (2026-07-08)

Adversarial sweep of the branch's tests for the "papering-over" failure mode: green
tests that prove little. Each finding = a test that stays green even if the code-under-test
breaks. Raw auditor output captured here first (durable); **verification + fixes tracked in
the Status column** as I challenge each finding against the real code.

Legend: ⬜ raw/unverified · ✅ verified-real (fixed) · ❌ verified-false (auditor wrong) · 🔧 fixing

---

## Cluster 2 — TS service / package / web unit tests

Recurring pattern: **local re-implementation of guard/schema logic instead of importing the SUT**
(a test that mirrors the production logic proves the mirror, not the code).

| # | Location | Defect | Sev | Status |
|---|----------|--------|-----|--------|
| 2.1 | `services/web/test/unit/routes/login.sign-in.test.ts:5-27` | Test defines its own inline `signInSchema` + manual `.trim().toLowerCase()`; imports **nothing** from `src`. Real `signInSchema` (login.tsx:24, non-exported) + lowercase-in-`handleSignIn` (login.tsx:95) never exercised. If login re-accepts email or drops lowercasing, test stays green (tests zero production code). | high | ✅ FIXED — extracted `signInSchema`+`normalizeUsername` to `features/auth/lib/sign-in-form.ts` (single source); login.tsx imports+uses it; test now imports the REAL module. web test/typecheck/lint green. |
| 2.2 | `services/web/test/unit/lib/route-authorization.test.ts:17-23` | `rolesBeforeLoad` re-implements the `user-management/roles` route guard inline instead of importing the route's real `beforeLoad`; capability set + `/dashboard` redirect duplicated. (Sibling `userDetailBeforeLoad` is fine — uses real `requireCapability`.) | med | ✅ FIXED — extracted `guardRolesAdminRoute` to `features/user-management/lib/route-guards.ts`; roles.tsx uses it as `beforeLoad`; test now imports the REAL guard and covers all 3 branches incl the previously-**omitted** `/user-management` redirect. web green. |
| 2.3 | `services/web/test/unit/components/capability-gate.test.ts:5-21` | `gateAllowed` re-implements CapabilityGate all>any>single precedence locally via non-hook helpers; real component's `anyOf`/`allOf` aliases (capability-gate.tsx:21-27) never touched. | low | ⬜ |
| 2.4 | `services/user-management-svc/test/unit/openapi/capability-response-validation.test.ts:28` | Happy-path only: asserts valid payload → `true`, never asserts invalid → `false`. A validator degraded to always-accept stays green. | low | ✅ FIXED — added a negative case: a payload missing required fields → `validate` returns `false` with non-null errors. |

**Clean (spot-checked, meaningful):** `services/bff/.../active-status-check.test.ts` (exemplary — fail-open, TTL, eviction, timeout-abort, log levels); user-management-svc authz-target-resolver/adapters/phase-1a-smoke; configurator-svc http-platform-module-catalog-client (non-2xx, malformed, empty-catalog floor); empi-svc identity-authz-wiring (401/skip matrix); many web api/permissions tests assert real values + negative branches. No render()-without-assertion FE tests.

---

## Cluster 1 — TS module unit tests (domain / use-cases / lib)

Suite broadly strong (most files assert values, mapped shapes, arg payloads, guard+success branches; `create-intake-for-new-patient`, `reset-user-password`, `create-care-context`, `handle-link-confirm-callback` exemplary). Few genuinely green-but-hollow:

| # | Location | Defect | Sev | Status |
|---|----------|--------|-----|--------|
| 1.1 | `modules/user-management/test/unit/data-access/principal-authorization-repository.snapshot.test.ts:25` | Wrong-thing assertion: name promises "reads user_capabilities only, not live role_capabilities" but sole guard is `expect(selectCallCount).toBe(1)`. `chain.from()` mock ignores its table arg, so a regression reading a live `role_capabilities` JOIN (still one select) stays green; `where()` returns a pre-baked clean row so trim/dedup/sort never runs. | med | ✅ FIXED — mock now captures the `from()` table and asserts it `.toBe(user_capabilities)` (proves the stated guarantee), and feeds duplicate/untrimmed/empty rows asserting the output is trimmed+deduped+empty-dropped+sorted. |
| 1.2 | `modules/integration-hub/src/integrations/abdm/use-cases/m3/hiu/get-consent-artefact-records.test.ts:44` | Happy-path-only: only the `!isConsentHealthDataAccessible → null` guard runs. Value path (consentId filter, per-artefact build, `artefactHipName`, the `consentId && targets.length===0 → null` branch at SUT:54) never exercised. | med | ✅ FIXED — added 3 value-path tests (stubbing the 2 delegated helpers): per-artefact assembly + `hipName` extraction from `artefactJson.consentDetail.hip.name`, the consentId filter, and the consentId-miss→null branch. |
| 1.3 | `modules/integration-hub/src/integrations/abdm/use-cases/m3/hiu/get-m3-attachment.test.ts:50` | Happy-path-only: all 4 tests force null (`listForRequest` always `[]`). Core `entryContentMatchesBundle` matching + `extractAttachmentContent` mapping never run; a break leaves all four `toBeNull()` green. | med | ✅ FIXED — kept the real consent-gate null tests; added value-path tests: match-by-FHIR-`id` (asserts the MATCHING entry's content goes to the extractor at `num`), careContextReference fallback on non-JSON content, and matched-but-not-extractable→null. |
| **1.5** | `vitest.config.ts` in integration-hub / configurator / web (**systemic — found while fixing 1.2/1.3**) | **~24 `src/`-colocated `.test.ts` files never ran** — a `test/**`-only vitest `include` silently omitted every colocated unit test. **integration-hub** (16 files: fhir-bundle-display, secure-otp-compare, gateway-client.http, m0/m2/m3 use-cases), **configurator** (1: list-active-abdm-integration-profiles), **web** (7). False coverage: ~66 tests appeared to exist but executed nowhere; 1.2/1.3 were among them. (registration/user-management have no local config → vitest default already collected their src tests.) | high | ✅ FIXED — added `src/**/*.test.ts` to all three includes (keeps `test/integration/**` + `*.sandbox` out). integration-hub 69→85 files (195→239 tests); web 91→98 (475→497); configurator +1 file — all green. |
| 1.4 | `modules/integration-hub/test/unit/integrations/abdm/lib/abdm-signature-verifier.test.ts:23` | Security-critical: only the reject path (missing issuer/audience in prod → false) tested; the signature-valid → `true` path never asserted, so an always-false (or always-true off-prod) verifier passes. Possibly covered by integration — confirm. | low | ⬜ |

**Clean:** user-management domain/use-cases, empi dedup/register, registration intake saga, pharmacy lib/use-cases, m1 request-builders, event-publish/envelope tests — all meaningful. Pure one-line delegations excluded per trivial-passthrough rule.

---

## Cluster 3 — Python (master-data + opd) integrity + real-DB coverage

| # | Location | Defect | Sev | Status |
|---|----------|--------|-----|--------|
| 3.1 | `modules/master-data/tests/test_api/test_departments.py:80,101` | **Departments router has ZERO persistence coverage** — both tests inject `FakeDepartmentRepository` (in-memory list) via dependency_overrides; `create_department` manually re-implements the real repo's flush ("*Mirror what the real repo's flush does*"). Green even if `DepartmentRepository` is fully broken. Departments is the LONE catalog using a fake — all 5 siblings use real `sqlite_session`. Untested: dup-code 409, tenant scope, get/patch/delete 404, entire `POST /import-from-platform`. | high | ✅ FIXED — rewrote to real `DepartmentRepository` + `sqlite_session` (matches sibling catalogs): CRUD lifecycle, dup-code **409 via the real partial-unique index**, get/delete 404. 4 tests pass; master-data suite 264 green. (import-from-platform FK-precheck → real-Citus layer.) |
| 3.2 | `modules/master-data/app/services/visitpad/platform_bulk_import.py:229` (via `test_visitpad_units_integration.py:213`) | **Prod Postgres `ON CONFLICT DO NOTHING` import path never executed.** `import_*_from_platform` branches `if session_is_postgresql(session)` → `pg_import_*` (`on_conflict_do_nothing(index_where=...)`); SQLite tests always take the `else` row-by-row fallback. The idempotency test exercises the WRONG path; prod partial-unique (global `code` vs tenant `(iq_tenant_id,code)`), RETURNING→id map, per-catalog index_elements uncovered. | high | ✅ FIXED — new real-Citus `tests/integration/` layer (`test_visitpad_import_pg.py`): drives `pg_import_units` and asserts re-import idempotency (ON CONFLICT) + tenant-scoped conflict target `(iq_tenant_id,code)`; guards `session_is_postgresql`. Added `test:integration` nx target (alembic upgrade heads → pytest) + `master_data` to CI DB loop; unit `test` now `--ignore=tests/integration`. Verified on real Citus. (All 12 other catalogs share the same `pg_bulk_insert_ignore_returning` helper.) |
| 3.3 | `modules/opd/tests/test_prescription_api_authz.py:30` | Status-code-only (`== 201`, no body/DB). Low: body+status_history+persistence fully asserted in `test_prescription_api.py:64`, cross-tenant in `test_prescription_api_tenant_security.py`. | low | ⬜ |
| 3.4 | `modules/master-data/tests/test_services/test_module_service.py:66,79` | Tautology over fake repo — service fns are literal one-line passthroughs; test proves only the passthrough. Acceptable (trivial SUT); noted as thin. | low | ⬜ |

**INFO (not a defect):** allow-all `_StubAuthzClient` across CRUD suites proves handler+persistence, not authz — but authz IS covered: `test_catalog_api_authz.py` drives the denying stub + records `resource_attr` across 5 admin + 13 visitpad routes (401/403/scope), and cerbos `{master_data_permissions,master_data_visitpad,opd_permissions}_test.yaml` exist. **Verified genuine parity (NOT masking):** every model carries `sqlite_where=` alongside `postgresql_where=`, so partial-unique 409s (modules slug/name, prescription (tenant,visit), visitpad code incl. case-insensitive) DO fire on SQLite; prescription tenant isolation is real `WHERE tenant_id=`.

### Real-DB coverage map → targets for the new real-Citus `test/integration` layer
**master-data:** `/departments` = **none** (fake repo) → dup-code 409, tenant isolation, import FK precheck. `/visitpad/*` (13) = sqlite-only → **ON CONFLICT idempotency on partial-unique index_where** (the untested prod path) + tenant isolation. `/modules` = sqlite-only → `parent_id` FK ondelete RESTRICT + name/slug partial-unique tenant-vs-global. `/permissions`,`/system-roles`,`/module-permissions`,`/inventory/*`,`/picklists` = sqlite-only → tenant scope + unique enforcement (+ module_permissions composite FK precheck).
**opd:** `/prescriptions/*` = sqlite (strong: body/FSM/409/cross-tenant) → prove `tenant_id` as **Citus distribution column** isolation + `prescriptions_tenant_visit_active_uq` partial-unique + child line FK/unique under real PG. `POST/GET /health-documents` = **none at HTTP** (only mocked-hub unit) → tenant-scoped persistence + idempotency. `GET /{visit}/documents/*.pdf|html` (6 routes) = **none** (only mappers unit-tested) → tenant-scoped fetch + cross-tenant 404.

---

## Cluster 4 — TS integration + Cerbos

The 8 *running* real-DB persistence suites are genuinely strong (persisted rows, two-tenant isolation, unique/idempotency incl. NULL holes + 23505 retries, FK-precheck 404-not-500, COUNT/pagination, RFC7807). **No running real-DB test is 2xx-only.** Defects are dead-in-CI wiring, not weak assertions.

| # | Location | Defect | Sev | Status |
|---|----------|--------|-----|--------|
| 4.1 | `modules/inventory/test/integration/store-persistence.integration.test.ts:21` | **DEAD in CI yet is the SOLE control for inventory tenant isolation.** Gated on `TEST_DATABASE_URL`, but inventory has **no `test:integration` target** and CI's per-module DB loop (`ci.yml:121`) omits `inventory` → `describe.skip`, never runs with a DB. File header: "without this test nothing proves cross-tenant reads are actually denied." So inventory cross-tenant denial is asserted by **nothing** in CI. | high | ✅ FIXED — added `test:integration` target (project.json) + `inventory` to CI DB loop (ci.yml:121). Ran against real Citus: 2 tenant-isolation tests pass. |
| 4.2 | `modules/integration-hub/test/integration/integrations/abdm/rest-handlers/scan-share-routes.integration.test.ts:47` | DEAD — `skipIf(!DB_URL)` on `SCAN_SHARE_TEST_DB_URL`, never provisioned in CI. Only coverage of scan-share token redemption / used-token 404 / active-queue SQL. | med | ⬜ |
| 4.3 | `modules/integration-hub/.../abdm/use-cases/{m1,m2,m3}/*.sandbox.integration.test.ts` (7) | DOUBLE-DEAD (vitest `exclude` + `RUN_ABDM_SANDBOX_TESTS` + live NHA creds). Acceptable manual-only, but M1/M2 chains + M3 HIU/HIP flows have no automated CI coverage beyond one mock loop — should be DOCUMENTED as manual-gated, not counted. | med | ⬜ |
| 4.4 | `modules/configurator/.../http/configurator-authz-pep.integration.test.ts:113` | Misnamed: does NOT test the Cerbos PEP (mock repos; only asserts client_secret redaction, which it does correctly). Real PEP round-trip is in the svc test. Name overpromises. | low | ⬜ |

**Cerbos (20 suites):** all principals match the exact runtime PEP wire shape (`principal-attr.ts`: iq_tenant_id, org_id, department, role_codes, scopes, capabilities, delegated_capabilities, clearances, um_clearance_effective_tier) — no stale attrs. 18/20 test ALLOW+DENY. **2 allow-only (DENY=0):** `role_cross_tenant_provision_test.yaml`, `user_cross_tenant_platform_operator_test.yaml` — assert operator CAN cross tenants but not the complementary deny. **LOW** — not a corpus blind spot: `platform_operator_scope_test.yaml` (DENY=12) proves the dead-string/no-scope case + bounds, and tenant_isolation/user_crud carry negatives; an allow-all regression WOULD be caught elsewhere. Optional: add one deny case to each.

**DEAD-in-CI integration files (silent no-run):** inventory store-persistence, integration-hub scan-share-routes, + 7 abdm `*.sandbox.integration.test.ts`. All others RUN (8 real-DB + several in-memory/no-DB).


---

## SQLite removal → real Postgres (master-data), 2026-07-08

Per user directive ("remove the sqlite thing… shift to postgres proper"), all DB-touching
master-data tests moved off in-memory SQLite onto real Citus Postgres, matching the TS
`test:integration` pattern.

- **~10 duplicated per-file SQLite fixtures** (`module_sqlite_session`/`permission_sqlite_session`/
  `visitpad_sqlite_session`/… each with its own `create_engine("sqlite://")`+StaticPool+`ATTACH`)
  and the shared `sqlite_session` in `tests/conftest.py` → **deleted**. Replaced by ONE shared
  fixture set in `tests/integration/conftest.py`: `pg_engine` (session), `pg_session` (per-test
  transaction rollback with `join_transaction_mode="create_savepoint"` so committing request
  handlers still unwind), and `pg_client` (authenticated TestClient on `pg_session`). Isolation:
  every table in the module schemas is truncated at the start of each test's transaction (empty
  slate matching what SQLite gave), restored on rollback — so absolute-count assertions still hold.
- **13 DB-touching files** now live under `tests/integration/` (run only under `test:integration`,
  gated by `TEST_DATABASE_URL`). 4 genuinely pure-unit files (`_dummy_session` authz/validation,
  header parsing) stay in `tests/test_api/`. Unit `test` target = `pytest --ignore=tests/integration`.
- Result: **188 unit + 78 integration green** on real Citus.

### 🔴 Real bug the SQLite masking hid — inventory feature had NO migration
The inventory-master feature (6 models × global+tenant = 12 tables, repos, **mounted API routes**)
shipped with **no alembic migration** — every real DB (dev/CI/prod) 503s on `/inventory/*`. The
SQLite tests only passed because `Base.metadata.create_all` fabricated the schema in memory; there
is no Python equivalent of the TS drizzle drift-gate to catch this. **Fixed:** added
`alembic/versions/0003_inventory_masters.py` (frozen DDL generated from the models, registered as
Citus reference tables like every other catalog table). The 3 inventory integration tests now pass
legitimately against real Citus. *Follow-up worth filing: add an alembic autogenerate drift-gate to
CI (mirror the drizzle one) so model-vs-migration drift can't recur silently.*
