# Cleanup initiative — resume state / handoff (snapshot 2026-07-07)

> **RESUME POINT (Fable /goal run, mid-W3):** Committed+pushed: **W0** `d526cf14`, **W1** `0b0955f6`,
> **W1.5 absorption** `fa3b1e3e` (backup tag `backup/pre-absorption-20260707`), **W2 PEP fleet** `2b206f8c`.
> **W3 is STAGED but NOT committed** (git index on disk — survives a session reset; agents/context do not):
> the bounded operator model (platform_admins table, JWT `scope:platform`, tenant-less operator token,
> `ts-sdk-identity` scope-gated tenant relaxation, additive scope allow-rules with clinical policies
> UNSCOPED = the bound, god-mode seed deleted) + ADRs **0034** (polyglot freeze) and **0035** (Phase-4
> authz). Before committing W3: (1) finish the M1/M2 security fix — M1 = reject **400 tenant_target_required**
> when a `scope:platform` (tenant-less) principal does a tenant-scoped UM write with no `iq_tenant_id`
> header (else it persists tenant `""`); M2 = remove the operator scope term from
> `master_data/department.yaml` + `master_data_visitpad.yaml` ONLY (clinical-reference data — keep it on
> module/permission/system_role/module_permission); (2) run the affected auth battery (user-management,
> user-management-svc, bff, ts-sdk-identity, configurator-svc + `cerbos compile --tests`) green; (3) commit
> operator model + both ADRs together, push. Then **W4** (alembic squash-to-one-baseline absorbing seeds
> 047/048/049 + fixing their hardcoded-PK downgrade round-trip; `make verify-local`; OM batch; D5 split),
> **W5** functional hardening, wrap-up. Full live detail in machine-local memory `project_fable_run_progress.md`.
> ADR-0035 already records the correct facts: the Python PEPs (#51 Half B) ARE built; D11 global-unique is
> correct-by-layering (auth.user non-distributed = global; distributed users = per-tenant per Citus), not drift.

Working branch **`dev--improved-v1`** (off `dev`). This doc is the quick operational pointer for
picking the work back up (e.g. on a new machine). The full detail lives in:
- `docs/architecture/cleanup/00-cleanup-master-map.md` — source of truth (20 areas, decision
  register D1–D21, roadmap, **session log** with per-step progress).
- `docs/architecture/cleanup/half-b-python-cerbos-pep-build-plan.md` — the #51 Half B build plan.
- `docs/architecture/cleanup/event-bridge-52-build-plan.md` — the #52 recon + scope decision.
- `docs/architecture/cleanup/authz-assessment-2026-06-21.md` — §Resolution (authz status).

## Fable takeover (2026-07-07) — the ACTIVE execution plan
Fable (claude-fable-5) took over execution in session "Refactor-Fable"; the clean-house plan **v3 is
ratified** (all open questions answered by the user). Waves, running autonomously on `dev--improved-v1`:
- **W0** commit these stranded docs (this edit). **W1** seed fix (`global_master`→`master_global`,
  prove `make seed` on a fresh migrate). **W1.5 ABSORB `origin/dev`** (+74 commits/+51k lines) —
  merge-tree rehearsal in a recon worktree, backup tag, then merge with reconciliation rules
  (visitpad=ours + re-apply their delete→deactivate terminology; user-management=ours per ADR-0003,
  harvest only their login bootstrap + `must_change_password`; port their legacy SQL migrations
  UM-`0007`/IH-`0005`/inventory-`0000–0004` to drizzle journals; alembic merge-revision until the W4
  squash). **W2** PEP fleet: configurator (per the audited plan below — now building, the
  "talk it through first" gate in §Where-things-stand is satisfied), **empi** (unlogged hole: no
  authzPlugin, identity `ENABLE_AUTH`-opt-in), **inventory** (absorbed from dev: authz theater,
  client-trusted tenant), integration-hub identity hardening. **W3** bounded `scope:platform` operator
  model + strip god-mode seed + Phase-4 authz ADR + polyglot freeze ADR. **W4** hygiene: alembic
  squash-to-one-baseline (absorbs both sides' chains incl. the `026_*`/`044–047` collisions),
  `make verify-local` standing gate, opportunity-menu batch, D5 master-data module/svc split.
  **W5** functional hardening: consent-pull polish (FE+BE exist on dev — port, don't build),
  scan-share refactor, login bootstrap port, M2 loud-failure + marked outbox seam, opd Citus
  distribution. **Wrap-up**: second recon vs dev, GH triage REPORT (user fires closes), docs-purge
  candidate list, merge-ready evidence run + PR narrative (target: PR `dev--improved-v1` → `dev`).

**Ledger corrections verified 2026-07-07** (stale claims below are struck by this):
username-primary flip DONE on this branch (`e52f71f3`, synthetic-email anchor, recovery Flow A);
`services/web` CI lint+typecheck gate DONE (`0d74ef13`, lint=0/typecheck=0); OPD JSONB
prescription-family retirement + `form_data` DROP DONE (`c2baa80c`, migration `0006`); D18
branch/worktree cleanup DONE. Session log §11 of the master map carries the takeover entry.

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
- **Stage by explicit path** (never `git add -A`). Commit trailer (since the Fable takeover):
  `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
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

## Where things stand (orientation — the user decides the next move, don't run ahead)
1. **Current in-flight task: the configurator Cerbos PEP** — the last Phase-4 authz cleanup item
   (the TS-side analogue of the #51 Python PEP on opd/master-data). **Status:** recon done; a full
   plan is written (`configurator-cerbos-pep-plan.md`) and has been adversarially audited; the
   *approach* is approved (Option A — full Cerbos PEP, over the alternative of hardening role gates).
   **Nothing is built yet.** What that plan settles, so you can infer the shape: it wires the existing
   `ts-sdk-authz` + `ts-sdk-identity` + UM enricher stack into configurator-svc (≈90% reuse, mirroring
   billing/pharmacy/registration); authors a `configurator` Cerbos policy set (8 capability-gated
   resource kinds — reads capability-gated too, since configurator exposes cross-tenant platform-admin
   data) + a capability seed; and removes the role-string `assertPlatformSuperAdmin` + the unsigned-JWT
   dev fallback. The audit surfaced three things any build must honor (a required post-seed re-sync; a
   `make seed` stale-schema bug `global_master`→`master_global` from migration 044; enricher+authz must
   register before the router). Super-admin here is capability-gated, i.e. *bounded-compatible* with the
   ratified operator model, not god-mode. Read the plan + the memories it links
   (`project_configurator_cerbos_pep`, `feedback_cleanup_philosophy`, `project_super_admin_operator_model`)
   to get the full picture, **then talk it through with the user before doing anything** — they want to
   plan and decide together, not have it executed unprompted.
2. Then / alternatively: functional ABDM/ABHA (M1/M2, consent-pull FE gap) or the clinical OPD flow.
3. Housekeeping: `event-bridge-52-build-plan.md` still frames a **TTL cache** for reach-in #1 — that is
   SUPERSEDED by the no-cache decision above (the file is kept as history; do not re-introduce the cache
   without the event-bust bridge).

> Note: my working memory lives OUTSIDE the repo, under the machine-local Claude projects dir
> (`~/.claude/projects/<slug-of-repo-path>/memory/`; currently `-home-xylar-projects-draft-The-HIMS`).
> Back that dir up separately to carry the full session memory to a new machine (it is intentionally
> NOT committed here).

---

## Cleanup philosophy — sharpened by the user 2026-07-07 (read before any cleanup work)
The initiative's TRUE intent, stated explicitly: a **fully hygienic repo with zero tech-debt artifacts
or "forced stuff."** Remove misunderstood / poorly-informed decisions and other devs' "just get it to
work" hacks. A clean repo beats a confusing one; **the app is NOT in production**, so:
- **Migrations are DISPOSABLE** — fine to discard/rebuild any/all. The master-data **alembic chain
  (52 files, incl. a 4-way `026_*` numbering collision + the not-ours `026_user_management_catalog_seed.py`)
  is a squash candidate**; TS drizzle-kit was already rebuilt fresh in Phase 1.
- **Fully locally runnable end-to-end** (`make infra` + `make seed` + `make dev`) is a north-star.
  Known crack: **`make seed` reads the stale schema `global_master`** (renamed → `master_global` in
  migration 044) in `sync-capabilities-from-master-data-catalog.ts` + `platform-data-bootstrap.ts` →
  likely throws. Fix such local-run breakages when found.
- **Prefer REMOVING a misunderstood artifact over working around it.**

**Junk register (examples flagged; expand as found):**
- `modules/user-management/src/dev/sync-super-admin-capability-snapshots.ts` — grants super-admin ALL
  catalog caps = interim GOD-MODE (`@deprecated`; also a `repair-platform-super-admin` bootstrap).
  Removal GATED on the bounded `scope:platform` operator model (Phase-4 authz; `project_super_admin_operator_model` memory).
- `make seed` stale-schema breakage (above).
- master-data alembic `026_*` numbering collision (4 files).

## The full directive + remaining-work snapshot (2026-07-07)
The initiative is the WHOLE clean-house effort — **fix / clean / refactor / re-architect / de-sloppify**
the monorepo into a fully-hygienic, fully-locally-runnable state, then complete the functional goal.
`00-cleanup-master-map.md` (Phases 0–6 roadmap + §11 session log) is the durable plan; a lot is DONE
(Phase 0 hygiene, Phase 1 DB/migration rebuild on real Citus, the TS lint gate, ruff, cognitive-complexity
refactor + rule-flip, the 10-module deep-vet + remediations, #51 Python PEP, #52 reach-in #1, D13 BFF
edge-auth). Reconstruct exact done-state from the §11 session log. **What REMAINS, grouped:**

- **Authorization (Phase 4):** the configurator Cerbos PEP (current slice — item 1 above); the **bounded
  `scope:platform` operator model** (build `platform_admins` + no-tenant JWT + PDP-evaluated scope,
  repoint the 4 role-string resolvers, **strip the god-mode all-caps seed**) + the Phase-4 authz ADR;
  close the abandoned authz stack #135–149; D16 frontend-authz docs.
- ~~**OPD consolidation tail**~~ — **DONE** (`c2baa80c`, 2026-06-29): JSONB prescription family retired
  + `form_data` dropped (migration `0006`); gates honored. (Stale here; corrected 2026-07-07.)
- **Cleanup streams:** ~~`services/web` has NO CI lint AND no typecheck~~ — **DONE** (`0d74ef13`:
  lint+typecheck nx targets wired into CI, both at 0 errors); event-bridge facade (D8, Phase 5) + reach-in #2 (opd→registration) +
  broker adapter; area slices P (observability) / R (error-handling) / S (docker-infra) / Q (seeding) /
  N (ci-cd tail) / O+D19 (deps); smart-report-v2 (D15); branch/worktree deletion (D18); issue triage
  (close realized #11/#33/#34/#129/#143 + the abandoned stack); the master-data alembic squash (52 files,
  `026_*` collision) per the migrations-disposable steer.
- **Open decisions (register §5):** D11 username uniqueness — **RESOLVED 2026-07-07 (Q-C): stays
  global-unique**, to be recorded in the Phase-4 authz ADR; D12 email anchor, D16 frontend-authz docs,
  D19 deps policy, D21 branch/integration strategy.
- **Functional completion (the real end goal):** ABHA M1 (enrol) + consent-pull FRONTEND (known gap; M2
  wire done); clinical/OPD polish; admin/granular-perms (delivered by the authz cluster); integration-first
  USP hardening.
- **Cross-cutting (the anti-sloppy mandate):** whenever you touch an area, REMOVE the misunderstood /
  "get-it-to-work" artifacts you find (junk register above), don't work around them.

## Where the durable state lives (for a fresh session / for Fable to pick up)
- **In-repo (portable, checked in):** `docs/architecture/cleanup/` — this handoff, `00-cleanup-master-map.md`
  (20 areas + roadmap + session log), `configurator-cerbos-pep-plan.md` (current task + audit appendix),
  `reachin-1-implementation-plan.md`, `01-module-vet-2026-06-22.md`, `authz-assessment-2026-06-21.md`.
- **Machine-local memory (NOT committed):** `~/.claude/projects/-home-xylar-projects-draft-The-HIMS/memory/`
  — `MEMORY.md` index + per-fact files (`project_configurator_cerbos_pep`, `feedback_cleanup_philosophy`,
  `project_super_admin_operator_model`, `project_cleanup_initiative`, …).
- **Fable (claude-fable-5) will assist** — point it at both locations above.
