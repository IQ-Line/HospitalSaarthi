# ADR-0029: Registration module owns encounter-intake; clinical modules own clinical encounters

- **Status:** Accepted
- **Date:** 2026-05-14
- **Deciders:** EM, Tech Lead, Architect (this ADR ratifies their decision; the dev's PR #51 is the first realisation)
- **Consulted:** Architect (raised the open question)
- **Informed:** OPD / IPD / Emergency module owners (downstream)

## Context and problem statement

The existing production HIMS bundles patient registration into the OPD module — the same database row carries OPD-visit lifecycle, billing linkage, and the "patient walked up to the desk" state. The platform refactor deliberately separates patient identity (EMPI) from clinical encounters (OPD / IPD / Emergency), but this left an explicit gap: **where does the row that says "patient X walked up to the desk for care today" live before the patient is routed to a clinical module?**

Two adjacent concerns sit nearby and must not be conflated:

- **Patient demographics** — owned by EMPI ([ADR-0007](./0007-empi-dedicated-platform-service.md)). UHID, name, DOB, phone, ABHA. *Not the question here.*
- **Clinical encounter content** — owned by the consuming clinical module (OPD visit, IPD admission, Emergency triage). Chief complaint, examination notes, prescription, orders. *Not the question here.*

The question is the **intake row**: who arrived, with what visit context, when, into which facility/department/provider, in what `pending → ... → routed` state. Before this ADR there was no single owner.

## Decision drivers

- **Frontdesk must be its own thing.** Bundling it into OPD reproduces the production-HIMS coupling we are deliberately moving away from. EMs / tech-leads / devs reading the system should see registration as a separate concern with its own service boundary.
- **Module shape rules.** No cross-schema foreign keys ([CLAUDE.md](../../../CLAUDE.md), [ADR-0012](./0012-multi-tenancy-isolation-strategy.md)). Whatever owns the intake row references EMPI by soft `patient_id` and downstream clinical encounters by soft `visit_id`.
- **Existing-prod parity.** The team needs to ship a working OPD-counter flow in Phase 1. EM directive: keep this surface minimal — "registration id, date, some other minor stuff" — matching what production's Visit row carries today, with the OPD-specific pieces stripped out.
- **Forward path to FHIR `Encounter`.** Record Foundation's `care_contexts.encounter_id` ([ADR-0028](./0028-record-foundation-fifth-core-module.md)) and Integration Hub's ABDM scan-and-share flow both assume "an encounter exists." We need a clear owner — and FHIR `Encounter` semantics map onto the *clinical* encounter, not onto the intake row.
- **Phase 0 deliverability.** Whatever shape we pick must be one developer × one sprint.

## Considered options

1. **Option A — Registration module owns the intake row; clinical modules own clinical encounters.** A dedicated `registration` module (and `registration-svc`) persists one row per intake episode, referencing EMPI by `patient_id` and the future clinical encounter row by nullable `visit_id`. Clinical modules (OPD, IPD, Emergency) create their own clinical-encounter rows in their own schemas when the patient is routed.
2. **Option B — Single platform-level `encounter` module shaped like FHIR `Encounter`.** A fifth or sixth core module that owns *both* intake and clinical-encounter state in one schema, with clinical modules attaching service-specific data as projections.
3. **Option C — Encounters belong to the consuming clinical module; no separate intake table.** Registration is purely a UI/BFF concern; the OPD module creates its visit row on first contact and the "registration desk" is a thin orchestration layer that calls EMPI then OPD.
4. **Option D — Hybrid: shared `visits` table inside EMPI or in a platform schema.** EMPI grows a `visits` table (or a new `platform` schema) that all clinical modules project from.

## Decision outcome

Chosen option: **Option A — Registration module owns the intake row.**

Rationale, in one paragraph: A separate `registration` module gives the EM/tech-lead the genuine module boundary they asked for (frontdesk is not OPD), matches FHIR semantics (the intake row is *not* an `Encounter` — that arrives later when a clinical module accepts the patient), keeps EMPI's surface narrow (demographics only, per [ADR-0007](./0007-empi-dedicated-platform-service.md)), and reuses the established module-shape pattern with no new abstractions. Option B over-engineers a cross-cutting clinical concept Phase 0 does not need; Option C leaks intake state back into clinical modules and reproduces the production-HIMS coupling we explicitly want to break; Option D inflates EMPI's responsibilities and contradicts the principle of one concern per core module.

### Consequences

**Positive:**

- **Module boundaries clean.** EMPI owns demographics; Registration owns intake; clinical modules own clinical encounters. Each module's `01-schema-design.md` references the next one by a single soft id.
- **Phase 0 surface is small.** One table, ~14 columns, four endpoints, one Citus-distributed schema. One developer can ship in a sprint.
- **Forward path to FHIR is preserved.** When the clinical-encounter row is created by OPD/IPD/Emergency, it can carry the proper FHIR `Encounter` semantics; Registration's row stays an operational intake stub.
- **Downstream modules get a stable id.** `registration_id` is the join key for queue display, billing projections, and reporting before `visit_id` exists.
- **Failure mode is honest.** New-patient orchestration declares its EMPI dependency explicitly (`EmpiPatientsPort`); when not wired, the API returns `503 empi_gateway_not_configured` instead of silently degrading.

**Negative / accepted trade-offs:**

- **Two rows per care episode** (`registration` row + later clinical-encounter row in OPD/IPD/Emergency). Operators / dashboards must join on `visit_id` once it is filled. The cost is a join; the benefit is module independence.
- **`visit_id` is nullable forever in early phases.** Until the clinical-encounter module is wired (OPD LLD next), the link is one-directional and operationally incomplete. Mitigation: a queue display works from `registration_id` alone; the clinical link arrives when OPD ships.
- **Existing-prod operators may not recognise "registration is not OPD."** Mitigation: the UI label can still say "OPD Registration"; the *backend* boundary is what matters for refactoring velocity.
- **No event published from Registration in PR #51's first cut** (deferred to Section 8 of the LLD). Consumers must poll until that lands. Mitigation: add `registration.created` / `registration.updated` rich-payload events in the next iteration; this ADR mandates it for Phase 1 acceptance.

**Follow-up actions:**

- [ ] PR #51 review (this ADR's first realisation) — see follow-up comment on the PR with severity-tiered must-fix / nice-to-fix items.
- [ ] Add `registration.created` event publisher to the Registration module before Phase 1 sign-off — load-bearing for queue, billing projections, and OPD's eventual encounter creation.
- [ ] OPD LLD (next architectural deliverable) must specify which OPD endpoint accepts a `registration_id` and creates the clinical-encounter row in `opd` schema, plus the back-link write to `registration.registration.visit_id`.
- [ ] Master Data: catalogue `visit_type` codes (`opd_first`, `opd_follow_up`, `ipd_admission`, `emergency`, ...) so Registration stores codes rather than free-text.
- [ ] Update [analysis/02-module-build-order.md](../analysis/02-module-build-order.md) to add Registration as a sibling of EMPI in Phase 1 (currently EMPI's section implicitly contains registration use-cases).
- [ ] Supersede the open question in `[[encounter-storage-open-question]]` memory with a link to this ADR.

## Pros and cons of the options

### Option A — Registration module owns the intake row (chosen)

- *Good:* Genuine module boundary — frontdesk is not OPD.
- *Good:* FHIR-aligned — the FHIR `Encounter` lives in the clinical module that *handles* the patient, not in the intake stub.
- *Good:* Reuses module-shape template; no new core abstractions.
- *Good:* Small Phase 0 surface (~14 columns, single table).
- *Bad:* Two rows per care episode; downstream joins on `visit_id`.
- *Bad:* `visit_id` nullable until the clinical-encounter module ships — operationally incomplete in early Phase 1.

### Option B — Cross-cutting `encounter` module shaped like FHIR `Encounter`

- *Good:* Single source of truth for "patient is currently in the building" across OPD / IPD / Emergency.
- *Good:* Maps cleanly onto FHIR `Encounter` from day one.
- *Bad:* Adds a sixth core-ish module that has to coordinate with every clinical module's state machine — coupling cost is high.
- *Bad:* Schema must anticipate IPD admission, Emergency triage, and OPD visit semantics simultaneously; over-engineered for Phase 0.
- *Bad:* Phase 1 OPD parity demo cannot ship until the encounter module catches up.

### Option C — Clinical modules own everything; no separate intake table

- *Good:* Fewest moving parts; matches existing production HIMS structure exactly.
- *Bad:* Reproduces the OPD-registration coupling we are explicitly moving away from. The whole point of the refactor was to make frontdesk not-OPD.
- *Bad:* Multi-service-desk flows (registration / OPD / vaccination / pharmacy) cannot share a routing record; each desk has to create its own snapshot.
- *Bad:* Re-introduces the production-HIMS pain point of "OPD owns registration" which is the very thing being refactored.

### Option D — Hybrid: shared `visits` table in EMPI or platform schema

- *Good:* Avoids creating a new module.
- *Bad:* Inflates EMPI's responsibility beyond patient identity ([ADR-0007](./0007-empi-dedicated-platform-service.md) defines EMPI as identity-only).
- *Bad:* Cross-cutting "platform schema" violates the one-concern-per-module rule and turns the platform schema into a junk drawer.
- *Bad:* Operationally indistinguishable from Option B but with worse naming.

## Links

- Related ADRs:
  - [ADR-0006 — Four core platform modules](./0006-four-core-platform-modules.md) (Registration is *not* fifth; it sits alongside future clinical modules)
  - [ADR-0007 — EMPI as dedicated platform service](./0007-empi-dedicated-platform-service.md) (defines EMPI's identity-only scope; Registration relies on this boundary)
  - [ADR-0008 — Module shape and boundaries](./0008-module-shape-and-boundaries.md) (Registration follows the standard shape)
  - [ADR-0009 — Event-driven inter-module communication](./0009-event-driven-inter-module-communication.md) (Registration must publish `registration.created`)
  - [ADR-0012 — Multi-tenancy isolation strategy](./0012-multi-tenancy-isolation-strategy.md) (composite PK on `(iq_tenant_id, registration_id)`)
  - [ADR-0028 — Record Foundation as fifth core module](./0028-record-foundation-fifth-core-module.md) (care_contexts.encounter_id consumes the clinical encounter, not Registration's row)
- Related HLD: [HLD 02 §2 — EMPI](../hld/02-core-modules.md#2-empi--patient-identity), [HLD 07 — Registration](../hld/07-registration.md) (introduced by PR #51)
- Related LLD: [Registration LLD](../lld/registration/01-module-overview.md) (introduced by PR #51)
- PR realising this ADR: [PR #51 — Hims 1255](https://github.com/IQ-Line/HospitalSaarthi/pull/51)
- Supersedes open question: `[[encounter-storage-open-question]]` (memory entry from 2026-05-13)
