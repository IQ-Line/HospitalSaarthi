# Cleanup initiative — resume state / handoff (snapshot 2026-07-02)

Working branch **`dev--improved-v1`** (off `dev`). This doc is the quick operational pointer for
picking the work back up (e.g. on a new machine). The full detail lives in:
- `docs/architecture/cleanup/00-cleanup-master-map.md` — source of truth (20 areas, decision
  register D1–D21, roadmap, **session log** with per-step progress).
- `docs/architecture/cleanup/half-b-python-cerbos-pep-build-plan.md` — the #51 Half B build plan.
- `docs/architecture/cleanup/event-bridge-52-build-plan.md` — the #52 recon + scope decision.
- `docs/architecture/cleanup/authz-assessment-2026-06-21.md` — §Resolution (authz status).

## Operational constraints (MUST hold)
- **`dev` MUST stay `12963b72`** (local dev is pinned there; origin/dev is ahead at `0cf7988b`).
  Never commit/push to `dev`. All cleanup work is on `dev--improved-v1`.
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

## IN PROGRESS — #52 event-bridge / D3 ports+adapters (RECON DONE, no code yet)
Read `event-bridge-52-build-plan.md`. Key finding: the async event-bridge facade
(`/internal/events` + merge `py-sdk-events` PR #31 + #30 catalog) is the **Phase-5** slice that
**decision D8 defers** — do NOT build it now. Actionable = close the 2 cross-schema reach-ins
HTTP-first (D3 ports + hand-written adapters).

**Decided scope (my recommendation; user was mid-system-migration — CONFIRM on resume):** do
**reach-in #1 only** — configurator → `master_global.modules` JOIN
(`modules/configurator/src/use-cases/list-entitlement-enabled-module-ids.ts:35,64`), which the
configurator LLD itself forbids. Fix = (a) a **narrow internal S2S route** on master-data
(`GET /internal/modules`, internal-key-gated, added narrowly to the `IdentityGateMiddleware` public
prefixes — Phase-4b made `/modules` JWT-gated), (b) a configurator `PlatformModuleCatalogPort` +
hand-written HTTP adapter + TTL cache (D3; ref = integration-hub `ConfiguratorHttpIntegrationProfileRepo`),
(c) rewrite the JOIN → in-memory filter on the cached catalog, preserving the orphan-drop
fail-closed behavior. **Defer to Phase 5:** reach-in #2 (opd → `registration` schema — clinical hot
path, meets the 4 projection criteria → needs the bridge), the async bridge, and the broker adapter.

## Next actions on resume
1. Confirm the #52 scope (reach-in #1 only) or redirect.
2. Implement per `event-bridge-52-build-plan.md`; verify end-to-end across both services; adversarial
   review; commit.
3. Then: configurator Cerbos PEP (separate Phase-4 authz item) and/or functional ABDM/ABHA work.

> Note: my working memory lives OUTSIDE the repo at
> `~/.claude/projects/-home-ayushiqline-projects-draft-The-HIMS/memory/` — back that dir up
> separately to carry the full session memory to a new machine (it is intentionally NOT committed
> here).
