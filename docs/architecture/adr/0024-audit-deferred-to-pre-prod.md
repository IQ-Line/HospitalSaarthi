# ADR-0024: Audit logging deferred to pre-prod; target pattern is cross-cutting hook

- **Status:** Proposed
- **Date:** 2026-05-11
- **Deciders:** [Architect], [Tech Lead], [Engineering Manager]

> **Note on numbering.** ADRs 0020–0023 are reserved for the in-flight Integration Platform LLD branch; this ADR slots above them.

## Context and problem statement

The Configurator LLD originally specified `config_change_audit`, a per-module audit table, with parallel designs proposed for `registry_change_audit` (Master Data) and `permission_change_audit` (User Management). Each table re-defined entity-type enums, action enums, JSONB before/after columns, and an "audit row's `iq_tenant_id` is the target tenant" distribution rule.

Two facts about the current state make this design premature:

1. **No production environment exists yet.** Phase 0 is internal demo + foundation building. No real tenant data, no regulator-visible audit trail to maintain, no compliance review imminent. Audit-trail compliance gates apply at prod onboarding (AIIMS go-live, DPDP review, ABDM certification renewal), not earlier.
2. **The intended long-term audit architecture does not need per-module tables.** Modern centralized audit is built on either an HTTP middleware capturing `{actor, action, resource, before, after}` at the API boundary, or CDC consuming the Postgres WAL — both of which capture at a layer above or below module schemas. Per-module audit tables in Phase 0 would be 6–18 months of code that gets deleted when the real audit system ships.

Building those tables now adds design surface to every module developer (entity-type enum maintenance, action enum maintenance, audit-distribution rule discipline, before/after capture in every handler) for capability we do not yet need and will not preserve. The Configurator developer working toward sprint demo is the immediate pressure point: removing audit from their plate is meaningful scope reduction without losing anything we'll regret.

## Decision drivers

- **Demo timeline.** A single developer is building Configurator toward a near-term demo. Audit tables roughly double the design surface they have to internalize (one audit table per module they touch, plus the cross-cutting rules) for no demo value.
- **Recoverable failure mode.** Deferring audit in Phase 0 has no compliance consequence because there is no prod data. The failure mode of "we waited" is fully recoverable: build the audit hook before any tenant goes live.
- **Forward compatibility.** The target audit architecture (hook/CDC) reads from events and request streams, not from per-module audit tables. Removing the tables now is *aligned* with the destination, not a regression from it.
- **Distinct from the projection question.** ADR-0024's reasoning ("come back later when we have prod") only holds because the failure mode is recoverable. The same logic does not generalize to anything labeled "later" — e.g. deferring authorization or tenant isolation would have non-recoverable failure modes and is not authorized by this ADR.

## Decision outcome

**Defer audit table implementation across all modules.** Phase 0 modules do not ship per-module audit tables. The Configurator's `config_change_audit` is removed from the LLD. Similar planned tables in Master Data (`registry_change_audit`) and User Management (`permission_change_audit`) are not yet in code; they will not be added in their current shape.

**Target audit pattern.** When audit becomes required (pre-prod gate, below), the architecture is:

- **Primary: HTTP middleware audit.** A middleware in the API gateway / module HTTP wrapper captures every successful mutating request as `{request_id, actor, iq_tenant_id, org_id, action, resource_type, resource_id, before_state, after_state, timestamp}` and emits an `audit.event` to a centralized audit service. The middleware lives in shared platform infrastructure, not in module code — modules remain unaware of audit.
- **Secondary: CDC.** Postgres logical replication feeds a CDC consumer (Debezium or equivalent) for cases where HTTP middleware coverage is incomplete (background jobs, event-handler writes, direct DB tooling). CDC is the safety net; middleware is the primary path.
- **Storage:** A dedicated audit service owns the audit data store. Modules do not own audit data.

The two patterns are complementary, not alternatives. Both rely on rich event payloads and per-request structured logs — which Phase 0 already produces.

## What Phase 0 must preserve so the target is buildable later

The deferral works only if Phase 0 modules do *not* drop the substrate the future audit consumer will need:

1. **Rich event payloads.** Every domain event carries the fields needed to reconstruct what happened without callback queries (already a CLAUDE.md rule). Do not slim payloads to "just IDs" for any reason.
2. **Actor capture on every mutating request.** Every handler authenticates the caller from the JWT (`user_id`, `iq_tenant_id`, `org_id`) and structured-logs the request with those fields. Required by the platform's standard request-logging policy.
3. **Soft delete by default.** `is_deleted`, `disabled_at`, `decommissioned_at` columns preserve operational history. The future audit consumer can read lifecycle changes from the data itself.
4. **`tenant_provisioning_log` and similar workflow logs stay.** These are not audit — they are operational state machines (idempotency, retry, observability). They remain in their respective modules.

If any of these substrates is dropped, the deferral becomes a real regression.

## The pre-prod gate

**No tenant goes live until the audit hook (HTTP middleware path, minimum) is shipped, verified end-to-end, and integrated into the BFF / module HTTP wrapper.** This gate is owned by:

- **Architect** (defines the audit hook spec — events captured, payload shape, storage destination).
- **Engineering Manager** (commits a sprint to building it before prod cutover).
- **Tech Lead / DevOps** (verifies it in staging before the first prod tenant is onboarded).

The gate is tracked as an issue in the prod-cutover checklist. Audit must be live in staging for at least two weeks of dogfooding before prod tenants are onboarded.

## Consequences

**Positive**

- Configurator developer's design surface reduces by one table + an enum set + a distribution rule + before/after capture discipline in every handler. Sprint demo timeline benefits directly.
- The same simplification applies to other Phase 0 module developers (Master Data, User Management, EMPI) without extra work.
- No throwaway code: per-module audit tables would be deleted when the hook ships. Skipping them avoids the write-then-delete cycle.
- The target architecture (hook + CDC) is industry-standard for centralized audit and aligns with where the prod HIMS team is likely to land.

**Negative / risks**

- **The pre-prod gate must not be forgotten.** This is the only meaningful failure mode. Mitigation: tracked as an explicit checklist item, owned by named roles. The gate is repeated in the build-order doc.
- **Investigation tooling gap during Phase 0 dev.** Without audit tables, "who changed this config last and why" is harder to answer during dev. Mitigation: rich event payloads + structured request logs cover most investigation needs at Phase 0 volume.
- **Reversibility.** If we later decide a per-module audit table is right after all, the design notes for `config_change_audit` (entity types, actions, distribution rule) are preserved in PR #38's history.

## Alternatives considered

- **Keep per-module audit tables in Phase 0.** Was the original design. Adds design surface without compliance value at this stage; produces throwaway code given the target architecture. Rejected.
- **Add a generic `audit_event` outbox table per module in Phase 0.** A lighter version that's forward-compatible with outbox-pattern audit consumers. Rejected because the target is hook/CDC, not outbox+relay — adding an outbox table now anticipates a different architecture and could lock us into it.
- **Build the audit service now.** Premature — no prod, no compliance pressure. Adds another deployable to the Phase 0 surface area.

## Related

- [Configurator LLD §9](../lld/configurator/01-schema-design.md#9-audit-logging--deferred) — applies this ADR to the Configurator module.
- [HLD §3.5+](../hld/02-core-modules.md#36-audit) — Configurator's audit posture.
- PR #38 — the implementation removing `config_change_audit` and committing this ADR.
- ADR-0017 (InProcessEventBus) — the current event bus has no durability, which is one reason an audit consumer can't subscribe directly today; the pre-prod gate may overlap with the durable-bus upgrade.
