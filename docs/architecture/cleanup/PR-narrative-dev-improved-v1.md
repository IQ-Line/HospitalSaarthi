# PR: `dev--improved-v1` → `dev` — clean-house initiative

**Branch:** `dev--improved-v1` (off `dev@12963b72`) · **~150 commits** · absorbs `origin/dev@0386cf54` in full.
**One-line:** a bottom-up hygiene + functional-hardening pass that leaves the monorepo fully locally
runnable, every service authorization-gated, the master-data migration chain squashed to one baseline,
and the clinical/ABDM surface refactored to the house architecture — while absorbing all of `origin/dev`.

> Merge posture: the branch **contains `origin/dev@0386cf54`** (absorbed at W1.5), so it merges back
> cleanly (dev is an ancestor). See `closing-evidence-2026-07-07.md` for the rebase-ability check and the
> full green evidence run. GitHub issue closes are the maintainer's to fire — see `gh-triage-2026-07-07.md`.

## What changed, by wave

**W0–W1 — foundations.** Committed the stranded cleanup docs with ledger corrections; fixed `make seed`
on a fresh database (stale `global_master`→`master_global` schema refs across the seed path; deleted a
workaround repair script; fixed an opd revision-id that overflowed alembic's `varchar(32)`). Proven by a
full fresh-Citus `make db-migrate` + `make seed`.

**W1.5 — absorbed `origin/dev` (+74 commits / +51k lines).** One deliberate merge (backup tag
`backup/pre-absorption-20260707`) resolving 60 conflicts under fixed reconciliation rules: user-management
stays ours per ADR-0003 (username-primary), adopting their `must_change_password` column + `/auth/login`
bootstrap + `department_id` provider filter; visitpad/catalog routes become deactivate-only; the inventory
module converted to drizzle journals (which surfaced that its legacy DDL never ran on real Citus — six
`ON DELETE SET NULL` FKs Citus forbids); their alembic 044–047 removed, deferred to the W4 squash. Verified
by two independent adversarial reviews (0 critical/major) plus the full battery.

**W2 — Cerbos PEP fleet.** Every service now runs identity → enrichment → Cerbos authz. Built PEPs for
configurator, empi (a forgotten hole — golden-record PHI was reachable without authz), and inventory
(removing its client-trusted tenant, hardcoded dev UUID, and unused-CERBOS_URL theater), plus an identity
partition for integration-hub (ABDM callbacks stay gateway-verified; platform routes JWT-gated). Live
401/403/200 round-trips per service; seeds chained 047→049; adversarial review's test-honesty findings
fixed and mutation-verified.

**W3 — bounded operator model + ADRs.** Replaced god-mode super-admin (a seed granting every capability)
with a `platform_admins` table + a `scope:platform` JWT claim (tenant-less operator token) that the PDP
evaluates; clinical policies carry no scope rule, so the operator is bounded to platform provisioning and
denied on clinical resources (proven live with a zero-capability operator). ADR-0035 (Phase-4 authorization)
and ADR-0034 (polyglot boundary freeze) record the decisions.

**W4 — hygiene.** Squashed the 54-file master-data alembic chain (with its collisions and fragile
hardcoded-PK seeds) to a single `0001_baseline`, proven by an **empty schema-diff** against the old chain's
output + byte-identical seed parity + 262 pytest. Added `make verify-local` (the standing local-runnable
gate). Extracted `@hims/ts-sdk-india` so the Indian-mobile validation/normalization rules live in one place.

**W5 — functional hardening.** opd Citus distribution (21 fact tables, closing the Phase-1 deferral);
scan-share refactored from two god-files to house architecture (handler 657→139, FE 1025→176) with the test
floor a zero-test feature never had; `must_change_password` enforced server-side at the BFF edge (was
FE-only/bypassable); M2 publish made loud-on-failure with one marked outbox seam (per the co-lead — control,
not an outbox); consent-pull polished (NRCeS rule dedup'd to `ts-sdk-fhir`, authz partition audited).

## Evidence
`docs/architecture/cleanup/closing-evidence-2026-07-07.md` — full test suites, lint, typecheck, cerbos
compile, `make verify-local`, fresh-DB migrate+seed, and rebase-ability, all with real numbers.

## Known follow-ups (not blockers; tracked in ADR-0035 + gh-triage)
- Deferred **D5**: master-data (and opd) module/service split — the module shouldn't *be* the service
  (clarified intent recorded); a dedicated verified refactor.
- Operator-action audit trail; a "clinical action must hit the PDP" inventory test; unify the generic
  `ts-sdk-tenant` header-first resolution onto UM's scope-gated shape; hub Cerbos PEP (behind the
  module/service composition decision); OM17 pincode-family dedup; the ajv `removeAdditional` hard-400 option.
- One untracked, not-ours, dead file (`services/web/.../um-permissions.test.ts`, imports a removed module)
  produces a local lint error but is outside the committed tree; a teammate owns it.
