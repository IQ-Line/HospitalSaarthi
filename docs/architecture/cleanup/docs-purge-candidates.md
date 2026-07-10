# Docs-purge candidates (end-of-run) — 2026-07-07

The `docs/architecture/cleanup/` directory was the **session-tracking workspace** for the clean-house
initiative, not permanent architecture. Per the ratified plan ("docs don't need committing; end-of-run
docs purge"), these are candidates to delete before the final merge-back. **The user fires the deletions**
— this is a recommendation, grouped by confidence.

## Safe to delete (transient tracking / superseded build plans)
- `HANDOFF-resume-state.md` — cross-session resume pointer; obsolete once merged.
- `configurator-cerbos-pep-plan.md` — W2 build plan; realized in commit `2b206f8c`.
- `reachin-1-implementation-plan.md` — prior-session build plan; realized.
- `half-b-python-cerbos-pep-build-plan.md` — #51 build plan; realized.
- `event-bridge-52-build-plan.md` — superseded (the TTL cache it framed was rejected; recorded in ADRs).
- `web-ci-gate-remediation-2026-06-29.md` — #50 remediation plan; realized (`0d74ef13`).
- `absorbed-inventory-catalog-migrations.md` — W1.5 bridge note; consumed by the W4 alembic squash.
- `PR-narrative-dev-improved-v1.md` — fold into the PR description, then delete.
- `docs-purge-candidates.md` — this file.
- `gh-triage-2026-07-07.md` — action list; delete after the issues are triaged/closed.
- `closing-evidence-2026-07-07.md` — merge-decision artifact; keep until merged, then delete (or archive).
- scratchpad `fable-takeover/plan.md` (machine-local, outside the repo) — already uncommitted.

## Consider keeping (has residual reference value)
- `00-cleanup-master-map.md` — the session log §11 is a useful audit trail of what changed and why across
  the whole initiative; consider archiving rather than deleting if you want the history discoverable.
- `01-module-vet-2026-06-22.md` / `authz-assessment-2026-06-21.md` / `opd-prescription-api-comparison.md` —
  analysis docs that informed decisions now captured in ADRs; deletable, but they hold the "why" in more
  detail than the ADRs. Judgment call.

## NOT purge candidates (permanent)
- `docs/architecture/adr/0034-*.md`, `0035-*.md` and the ADR `README.md` index — permanent architecture
  decision records. Keep.

Note: the machine-local memory (`~/.claude/projects/.../memory/`) is intentionally uncommitted and separate;
nothing to purge in-repo for it.
