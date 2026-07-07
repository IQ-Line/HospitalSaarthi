# Cleanup initiative — resume state / handoff (snapshot 2026-07-07)

Working branch **`dev--improved-v1`** (off `dev`). This doc is the quick operational pointer for
picking the work back up (e.g. on a new machine). The full detail lives in:
- `docs/architecture/cleanup/00-cleanup-master-map.md` — source of truth (20 areas, decision
  register D1–D21, roadmap, **session log** with per-step progress).
- `docs/architecture/cleanup/half-b-python-cerbos-pep-build-plan.md` — the #51 Half B build plan.
- `docs/architecture/cleanup/event-bridge-52-build-plan.md` — the #52 recon + scope decision.
- `docs/architecture/cleanup/authz-assessment-2026-06-21.md` — §Resolution (authz status).

## Operational constraints (MUST hold)
- **Never commit/push to `dev`.** All cleanup work is on `dev--improved-v1` (branched off
  `dev@12963b72`; origin/dev has since moved on — on a fresh clone local `dev` just tracks origin,
  which is fine, the branch base is fixed in history).
- **Never commit the "not-ours" untracked files** (teammates' uncommitted WIP living in the tree):
  `modules/master-data/alembic/versions/026_user_management_catalog_seed.py`,
  `services/web/src/features/user-management/lib/um-permissions.test.ts`,
  `services/web/src/features/frontdesk/api/register-patient.ts`,
  `tools/seed-user-management-dev.mts`,
  `packages/ts-sdk-abha/src/protocol/m1/enrol-mobile-otp.ts`,
  `packages/py-sdk-fhir/src/hims_sdk_fhir.egg-info/`,
  `docs/architecture/lld/integration-platform/DEVNOTE-2026-05-28-*.md`,
  `docs/architecture/lld/record-foundation/{02-adversarial-review,build-plan,implementation-checkoff}.md`,
  `docs/sprint-demo-plan.md`, `infra/db/{create-module-databases.sql,pg-init-trust.sh}`.
  These are untracked so they won't push; they will simply be absent on a fresh clone — that's fine.
- **Stage by explicit path** (never `git add -A`). Commit trailer:
  `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.
- Cleanup is **on-the-side**: read/review existing GitHub PRs/issues, never mutate them.
- WSL2/zsh; `uv` for the Python modules; `nx`/`pnpm` for TS. `tsc -b` is OK now (swap increased);
  avoid long-lived watch-mode.

## DONE this arc — #51 per-module in-process authz (opd + master-data), COMPLETE
Commits `12963b72..HEAD` (13, incl. docs). Half B built the Python Cerbos PEP end-to-end:
- Phase 1 `e37d2b6c` — `packages/py-sdk-authz` (`hims_authz`): RS256/JWKS verify + HTTP-first
  `/auth/principal` enrichment + async Cerbos client + FastAPI identity-gate + guard deps (53 tests).
- Phase 2/3 `ab775519`/`c82aa82a` — opd policies+seeds; opd-svc PEP wired; `SYSTEM_DOCTOR_ID`
  header-trust removed.
- Phase 4a/4b `aef0125f`/`d08710b4` — master-data policies+seeds; `create_app(deps)` PEP wiring
  (identity gate + `guard`/`department_guard`; 5 admin catalogs write-guarded; `actor_id`=verified sub).
- Phase 5 `734d6c36` — deleted dead auth scaffolding (incl. the unsigned-JWT `resolve_superadmin_actor`
  landmine) + `infra/k8s/base/network-policies.yaml`.
- Phase 4c `57356fd2` (+docs `216b84b5`) — visitpad 52 write routes cap+tenant gated
  (`master_data_visitpad.yaml` → department pattern; `authz.py` shared `tenant_scoped_guard` +
  `visitpad_guard`; wired via an 11-agent fan-out; cerbos 119/119, 252 pytest, live 11/11).
Verification standard held throughout: ruff + pytest + `cerbos compile` + a **live real-Cerbos
round-trip** + an adversarial-review pass per phase. `#51` is closed.

## DONE — #52 reach-in #1 (configurator → master-data, HTTP-first), COMPLETE
Commit `223d7818` on `dev--improved-v1`. Closed the configurator → `master_global.modules` cross-schema
JOIN (`list-entitlement-enabled-module-ids.ts`) HTTP-first (D3/D8):
- master-data: internal S2S route `GET /api/v1/master-data/internal/modules` (whole global catalog
  `{data:[{id,is_deleted}]}`, self-gated by `x-master-data-internal-key` / `MASTER_DATA_INTERNAL_API_KEY`,
  added narrowly to the identity-gate public prefixes).
- configurator: `PlatformModuleCatalogPort` + hand-written `HttpPlatformModuleCatalogClient` (fetch,
  fail-loud throw); use-case rewritten to filter orphans in-memory (Citus SELECT-then-UPDATE preserved).
- **Adversarial review changed the design:** NO adapter cache (it was redundant behind UM's per-tenant
  `CachedTenantEntitlementResolver` AND it created a sticky-deactivation hazard; the event-bust cache is
  deferred to Phase 5 with the bridge), plus a fail-closed FLOOR (empty catalog + active tenant modules
  → throw, never mass-deactivate).
- Verified: master-data 259 pytest + ruff; configurator-svc 6 adapter; configurator 59 unit + 30
  integration (real Citus); lint 0; svc `tsc` clean; live uvicorn S2S smoke; 4-lens adversarial review.
Full detail: `docs/architecture/cleanup/reachin-1-implementation-plan.md`.

**Deferred to Phase 5 (unchanged):** reach-in #2 (opd → `registration` schema — clinical hot path, meets
the 4 projection criteria → needs the event bridge), the async event-bridge facade, and the broker adapter.

## Next actions on resume
1. **configurator Cerbos PEP** (chosen next, 2026-07-07) — the remaining Phase-4 cleanup authz item:
   the TS-side analogue of the #51 Python PEP (opd/master-data). Scope it recon-first → plan → confirm
   → code, the same way #52 reach-in #1 went. See `authz-assessment-2026-06-21.md` §Resolution for the
   current authz status.
2. Then / alternatively: functional ABDM/ABHA (M1/M2, consent-pull FE gap) or the clinical OPD flow.
3. Housekeeping: `event-bridge-52-build-plan.md` still frames a **TTL cache** for reach-in #1 — that is
   SUPERSEDED by the no-cache decision above (the file is kept as history; do not re-introduce the cache
   without the event-bust bridge).

> Note: my working memory lives OUTSIDE the repo, under the machine-local Claude projects dir
> (`~/.claude/projects/<slug-of-repo-path>/memory/`; currently `-home-xylar-projects-draft-The-HIMS`).
> Back that dir up separately to carry the full session memory to a new machine (it is intentionally
> NOT committed here).
