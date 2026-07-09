# ADR-0037: User capability resolution — live JOIN base + grant/deny overrides (Phase 1.5)

- **Status:** Accepted
- **Date:** 2026-07-09
- **Deciders:** User Management module owners, platform architecture
- **Related:** ADR-0031 (role-template snapshot semantics), ADR-0032 (entitlement intersection), PRs #13, #42, #46, #56, issue #60

## Context and problem statement

The User Management capability model reshaped four times across three weeks before it first merged (PR #56):

| Era | PR | Model | Characteristic |
|-----|----|----|-----------------|
| 1 | #13 (original) | `role_capabilities` join table only | Runtime access recomputed live from current role composition |
| 2 | #13 (review ask) | `role_permissions` referencing a Master Data catalog | Misread of catalog ownership — walked back |
| 3 | #42 | `role_permissions(permission_slug text)` | UM owns slugs directly, no UUID indirection |
| 4 | #46 | UUID-FK `role_capabilities(role_id, capability_id)`, JOIN at request time | Correct catalog alignment; detach/re-apply semantics still ambiguous |
| 5 | #56 | Materialized `user_capabilities` snapshot, `grant_source` (`manual`\|`role_template`\|`delegated`\|`system`), copy-on-apply | Solved detach/re-apply predictability; **new problem below** |

ADR-0031 (era 5, PR #56) chose snapshot materialization to fix two concrete PR #56 review blockers: orphaned `role_template` grants surviving a detach, and re-apply not narrowing an existing user's capability subset. It shipped as **Phase 1**, explicitly deferring the read path: `DrizzlePrincipalAuthorizationRepository.listEffectiveCapabilityKeys` unions the `user_capabilities` snapshot **with a live `user_roles ⨝ role_capabilities` join**, documented in ADR-0031 §"Temporary architecture notes (pre-#60)" as transitional, tracked as issue #60.

That hybrid read path has a correctness consequence ADR-0031 flagged but did not fix: **"Pattern A" restrict-narrow does not work at runtime.** An admin can apply the doctor role to Dr. Singh with a capability subset (`role_template_capability_ids` excluding `W`), and the write path correctly narrows `user_capabilities`. But the live-join half of the hybrid read still unions the role's **full** current composition, including `W`, into what Cerbos evaluates. The subset the admin configured is invisible at the PDP. Restricting a user's effective access — the entire point of the subset-apply feature — silently does not happen. This is not a hypothetical: it is a direct product requirement (see the "Doctor \*" case worked with the EM) that the Phase 1 shape cannot deliver, only display.

A second, independent gap: role deletion. Under the Phase 1 shape, a `user_capabilities` row carries `source_role_id` with `ON DELETE RESTRICT` back to `roles`. An admin who granted a `manual` exception unrelated to any role, or who wants a capability to **survive** a role's removal, has no way to express that — `source_role_id` FK semantics assume every override traces back to a role's continued existence, which is not true for manual/system-sourced or intentionally-orphaned grants.

## Decision drivers

- **Correctness over UX-only display.** The subset a role-template apply configures must be what the PDP actually evaluates, not merely what the admin UI renders. A "restrict" feature that only restricts the label is a defect, not a phase boundary.
- **Predictable behavior across role lifecycle.** An explicit per-user exception (grant or deny) must not be silently deleted or silently reactivated purely because a role definition changed or a role was removed. That is exactly the "orphan grant survives role removal" scenario issue #60 needs to be able to represent — which the Phase 1 `source_role_id` FK-restrict shape structurally cannot, since it ties every override's existence to a role foreign key.
- **No live Master Data / Configurator calls on the PDP hot path** (unchanged from ADR-0031/0032) — this ADR only changes what UM's own tables represent, not the entitlement-intersection contract.
- **Auditability of exceptions.** A grant or deny override is a deliberate administrative act; it should carry a `reason`, distinct from "this is what the role template says."
- **Wire-shape stability.** `GET /auth/principal` and the Cerbos principal attribute shape (`capabilities`, `delegated_capabilities`) from ADR-0032 must not change — this is a resolution-recipe change behind an unchanged interface, not a protocol change.
- **No production tenants exist yet.** Per the branch's disposable-migrations decision, there is no live tenant data to preserve across the schema change — a clean drop/recreate of `user_capabilities` is available as an option, not just an in-place `ALTER`.

## Decision outcome

**Three-layer resolution, evaluated at principal hydration (before the ADR-0032 tenant-entitlement intersection, which is unchanged and still applies on top):**

```
Layer 1 — Base:        user_roles ⨝ role_capabilities        (live join; role template composition, today)
Layer 2 — Overrides:    user_capabilities                     (effect = 'grant' unions in, 'deny' excludes)
Layer 3 — Delegation:   delegated_capability_grants            (time-bounded overlay; unchanged from ADR-0031)

effective_role_keys = (Layer 1 UNION grant-overrides) EXCEPT deny-overrides
effective_capabilities = (effective_role_keys ∪ Layer 3 keys) ∩ tenant_entitlement_keys   [ADR-0032, unchanged]
```

`role_capabilities` stops being copied anywhere. It is read live on every principal hydration — a role edit is now visible to every assigned user on their next request, with no re-apply step. `user_capabilities` stops being a snapshot of role-derived rows and becomes **exclusively** the per-user exception table: one row per `(tenant, user, capability)` recording that this user's effective access for that capability is pinned away from whatever Layer 1 says, with an explicit reason.

### Worked example — orphan grant survives role removal

Dr. Singh holds the `doctor` role (Layer 1 includes capability `W`) plus a `deny` override on `W` (restricted by an admin, reason: "under supervision"). If the `doctor` role is later deleted:

- **Phase 1 shape (rejected for this case):** the override row's `source_role_id` FK is `ON DELETE RESTRICT` against `roles` — the role delete either fails outright, or (if the FK were relaxed) an ON-DELETE-CASCADE-style implicit cleanup would silently drop the override, un-restricting Dr. Singh with no admin action.
- **Phase 1.5 shape (this ADR):** the override row has no FK to any role at all. Layer 1 simply stops contributing `W` (or any of `doctor`'s other capabilities) once the role is gone; the `deny` override on `W` is now a no-op (nothing to deny), and any **unrelated** `grant` override Dr. Singh held survives untouched, exactly as an explicit administrative exception should. The override table's lifecycle is decoupled from role lifecycle by construction, not by FK-permission accident.

### Schema (`modules/user-management/src/schema/tables.ts`, `user_capabilities`)

| | Phase 1 (ADR-0031) | Phase 1.5 (this ADR) |
|---|---|---|
| Kept | `iq_tenant_id`, `id`, `user_id`, `capability_id`, `granted_by_user_id`, `granted_at` | same |
| Dropped | `grant_source`, `source_role_id`, `revoked_at`, `revoked_by_user_id` | — |
| Dropped FKs/constraints | `fk_user_capabilities_tenant_source_role`, `fk_user_capabilities_tenant_revoked_by_user`, `user_capabilities_grant_source_chk`, `idx_user_capabilities_tenant_user_revoked` | — |
| Added | — | `effect text NOT NULL` (`'grant' \| 'deny'`), `reason text NULL` |
| Added constraint | — | `user_capabilities_effect_chk CHECK (effect IN ('grant','deny'))` |
| Unchanged | `PRIMARY KEY (iq_tenant_id, id)`; `fk_user_capabilities_tenant_user` → `users` (restrict); `fk_user_capabilities_capability` → `capabilities` (restrict); `fk_user_capabilities_tenant_granted_by_user` → `users` (restrict); `UNIQUE(iq_tenant_id, user_id, capability_id)`; `idx(iq_tenant_id, user_id)`; `idx(iq_tenant_id, capability_id)` | same |

Dropping `source_role_id` (and its FK) is not incidental cleanup — it is the mechanism that makes the worked example above possible. A table that still pointed every override back to a role could not represent "this exception is deliberately independent of any role."

`role_capabilities` and `roles` are unchanged in shape; they are simply read differently (live, every request, instead of copied at apply time).

### Migration approach

No backfill. Per the branch's disposable-migrations decision (schema is not yet serving any production tenant), the table is dropped and recreated in the new shape rather than `ALTER`ed with a compatibility bridge. Phase 1 `role_template`-sourced rows encoded nothing an admin could not re-derive by re-applying the (unchanged) `role_capabilities` composition; Phase 1 `manual`/`system` rows are the only ones with independent administrative intent, and — being pre-prod — are re-seeded rather than data-migrated.

## Consequences

**Positive:**

- Closes the restrict-narrow correctness gap (ADR-0031's F6/"hybrid PEP" defect): what the PDP evaluates now matches what the admin configured, because there is no snapshot copy to go stale relative to the live role definition.
- Role template edits propagate to all assigned users immediately — no "re-apply" admin action required, no drift between role definition and assigned users' access.
- Per-user exceptions (grant or deny) are structurally independent of role lifecycle: they survive role edits and role deletion by construction, not by FK-permission accident (see worked example).
- `reason` gives every deliberate exception an audit trail distinct from "inherited from role."
- Removes the write-amplification cost of Phase 1 (`N` users × `M` new capabilities on role re-apply) — there is no re-apply step.
- `DrizzlePrincipalAuthorizationRepository.listEffectiveCapabilityKeys` sheds its hybrid-union shape (the exact code ADR-0031 flagged as transitional) for one query recipe with no "temporary" branch.

**Negative / accepted trade-offs:**

- Role edits now propagate live to every assigned user with no per-user isolation. This is the **opposite** trade-off from ADR-0031's "hospital change-control" driver (Phase 1 chose snapshot specifically so a role edit would *not* retroactively change existing users). Phase 1.5 accepts immediate propagation because it is required for restrict-narrow to work at all — a snapshot model cannot deliver "restrict" without a re-apply step, and the two behaviors (isolate-until-reapply vs. restrict-now) cannot both hold under one resolution recipe. If change-controlled rollout of a role edit is later needed, it requires a separate mechanism (e.g., staged role versions), not a revival of per-user snapshotting.
- `user_capabilities` now requires every write path (manual grant/deny, delegation-adjacent tooling) to set `effect` explicitly — there is no longer a "this came from a role" default to fall back on.
- OpenAPI (`user-management.v1.yaml`), LLD, and any UI copy describing "grant_source" / snapshot semantics need updating to the override model — tracked as follow-up, not covered by this ADR alone.
- `permission_change_audit` writers remain unimplemented (carried over from ADR-0031's follow-up list; unaffected by this ADR).

## Alternatives considered

### Keep the Phase 1 hybrid indefinitely (rejected)

- *Good:* No further schema change; PR #56 already shipped it.
- *Bad:* Does not fix the restrict-narrow defect — the live-join half will always win over a narrower snapshot for any capability the role currently grants. This is not a stable end state, only ever documented as transitional in ADR-0031.

### In-place `ALTER` with dual-read backfill period (rejected)

- *Good:* Textbook zero-downtime migration pattern for a table already serving production traffic.
- *Bad:* No production tenant exists on this table yet — the backfill/dual-read machinery (its own source of bugs) buys safety this branch does not need. Consistent with the branch's general disposable-migrations posture (D2): clean drop/recreate over defensive incremental `ALTER` when there is no live data to protect.

### Cerbos-side override evaluation (derivedRoles/exportVariables encode grant/deny) (rejected)

- *Good:* Keeps all resolution logic in policy-as-code.
- *Bad:* Duplicates the intersection logic ADR-0032 already rejected doing in Cerbos for the same reason (policy drift from the DB-resolved principal attributes); overrides are administrative data, not policy — they belong in UM's tables per ADR-0031's entitlement-boundary rule ("Master Data owns catalog, Configurator owns tenant enablement, User Management owns persisted runtime grants, Cerbos evaluates only").

### Note on precedent

An adjacent internal project (IQSandbox) runs a similarly-shaped `tenant_role_permissions` + `user_permission_overrides(granted boolean)` + a `get_effective_permissions()` live-union/except function. That project's architectural choices are **not** treated as authoritative here — it is flagged elsewhere in this program as a UI-component source only, not an architecture reference, and its patterns are not adopted by default. The decision above is driven entirely by this module's own PR #56 review history and issue #60's correctness requirement; the IQSandbox shape is noted only as evidence that the same UX contract (multi-role union with explicit per-user grant/deny exceptions) has been built as a live-JOIN-plus-overrides recipe elsewhere, not as a reason to copy it.

## Links

- ADR-0031: [User Management role-template snapshot semantics](0031-um-role-template-snapshot-semantics.md) (Phase 1, superseded by this ADR for the read path and `user_capabilities` shape)
- ADR-0032: [Runtime effective capabilities = stored grants ∩ tenant entitlement](0032-runtime-effective-capabilities-entitlement-intersection.md) (unchanged; applies on top of this ADR's resolution)
- LLD: [01-schema-design.md](../lld/user-management/01-schema-design.md), [02-scenarios.md](../lld/user-management/02-scenarios.md), [04-module-capability-vocabulary.md](../lld/user-management/04-module-capability-vocabulary.md)
- Gap audit: [pr56-review-gap-audit.md](../lld/user-management/pr56-review-gap-audit.md) §5 "Future migration friendliness (#60)", §6 implementation matrix ("#60 transition doc")
- Cleanup master map: [00-cleanup-master-map.md](../cleanup/00-cleanup-master-map.md) area E
- Implementation: `modules/user-management/src/schema/tables.ts` (`user_capabilities`), `modules/user-management/src/data-access/principal-authorization-repository.ts` (`listEffectiveCapabilityKeys`)
