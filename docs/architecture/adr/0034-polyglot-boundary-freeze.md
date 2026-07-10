# ADR-0034: Freeze the polyglot language boundary where it stands

- **Status:** Accepted
- **Date:** 2026-07-07
- **Deciders:** Architect, Engineering Manager, Tech Lead
- **Consulted:** OPD module owner, Master Data module owner
- **Informed:** Whole engineering team

## Context and problem statement

[ADR-0016](./0016-polyglot-nx-monorepo-spec-first-contracts.md) chose an Nx monorepo *because* polyglot support was a hard requirement — the repo must never assume a single-language ecosystem. That door, once opened, has stayed open: the platform is TypeScript-first, but two modules (`modules/master-data`, `modules/opd`) and three SDK packages (`packages/py-sdk-authz`, `packages/py-sdk-fhir`, `packages/py-sdk-abha`) are Python. During the `dev--improved-v1` cleanup the question surfaced from both directions: *should we standardise back to TypeScript by rewriting the two Python modules?* and, conversely, *should the next module also be Python since we already pay for a Python toolchain?* Both drifts are live risks; neither has an owned decision. Reversing the polyglot decision itself is off the table (org constraint), so the decision that remains is **where the boundary sits and whether it moves.**

## Decision drivers

- **The polyglot decision (ADR-0016) is not reopened.** This ADR does not re-litigate whether the repo may be polyglot — it may. It decides only the *shape and mobility* of the boundary.
- **Cross-language cost is real and already being paid** — not hypothetical. See "Current polyglot surface" below for the specific duplications and divergences on `dev` today.
- **One Python module has a genuine reason; one does not.** OPD is Python for a concrete ecosystem reason (FHIR/ABDM). Master Data is Python by path-dependence — a first-slice implementation choice, not an intrinsic need. A single rule must cover both without pretending they are the same.
- **"We already have a Python toolchain, so the next module can be Python too" is exactly the reasoning the freeze exists to stop.** Every new Python surface re-multiplies the duplication cost, and each increment is individually cheap — which is how boundaries drift.
- **Cleanup's job is to stop drift, not to rewrite working code.** Porting two shipped, tested modules to TS is a large project with no functional payoff; it is not in scope for a cleanup pass.

## Current polyglot surface (verified against `dev--improved-v1` HEAD, 2026-07-07)

Determined by presence of `pyproject.toml` vs `package.json` per project:

- **Python:** `modules/master-data`, `modules/opd`; `packages/py-sdk-authz` (`hims_sdk_authz`), `packages/py-sdk-fhir` (`hims_sdk_fhir`), `packages/py-sdk-abha`.
- **TypeScript:** every other module (`billing`, `configurator`, `empi`, `integration-hub`, `inventory`, `pharmacy`, `record-foundation`, `registration`, `user-management`) and every non-`py-sdk-*` package.

**Why each Python module exists (investigated, not assumed):**

- **OPD — a real ecosystem reason.** OPD owns clinical-document capture and emits NRCeS/ABDM FHIR R4 Document Bundles (OP Consultation, Prescription, Immunization, Health Document). It depends on `hims_sdk_fhir` and `azure-storage-blob` (`modules/opd/pyproject.toml`). Per [ADR-0023](./0023-distributed-fhir-assembly.md) and `packages/py-sdk-fhir/README.md`, the Python FHIR SDK shipped its skeleton first and its implementation landed *when OPD needed FHIR serialisation* — the FHIR/ABDM library surface is mature and idiomatic in Python. This is a defensible reason, not "we did it this way before."
- **Master Data — path-dependence, not intrinsic need.** `modules/master-data/README.md` describes it only as "Python FastAPI implementation of the HIMS Master Data module." Its dependencies (`fastapi`, `sqlalchemy`, `alembic`, `pydantic`, `hims_sdk_authz`) are all met equally well in TypeScript; there is no FHIR, crypto, or ML surface that pulls it toward Python. It is Python because the first developer built the first slice in Python — the exact "needlessly Python" case that motivated recording this ADR. The freeze keeps it (rewriting buys nothing), but does **not** endorse its language as a precedent.

**Cross-language cost being paid today (concrete):**

- **Mirror-SDK duplication.** `packages/py-sdk-fhir` is, by its own README, a "Python mirror of `@hims/ts-sdk-fhir`"; `packages/py-sdk-authz` "mirrors `@hims/ts-sdk-identity` + `@hims/ts-sdk-authz`." FHIR assembly and the authz PEP are each implemented and tested twice, and must be kept in lockstep by hand.
- **Divergent auth/trust model.** `docs/architecture/lld/platform-security/01-unified-service-authentication.md` §6 records Master Data on a "Divergent" trust path (`app/middleware/auth_policy.py`, HS256/dev-bypass, Cerbos "N/A") versus the TS `ts-sdk-identity` RS256/JWKS path — a separate JWKS integration to build and align.
- **Two of everything at the toolchain edge.** Separate lint/test/CI legs (`ruff`/`pytest`/`pyright` vs `eslint`/`vitest`/`tsc`) and two dependency ecosystems (`uv`/`pyproject.toml` vs `pnpm`/`package.json`).
- **No shared in-process bus across the boundary.** The InProcessEventBus ([ADR-0017](./0017-in-process-event-bus-phase-0.md)) is TypeScript-only; the Python modules cannot join it in-process and reach TS peers over HTTP instead. Any shared domain rule (e.g. the Indian-mobile normaliser in `modules/empi/src/lib/indian-phone.ts`, today TS-only) would have to be re-expressed in Python the moment a Python module needed it — a duplication waiting to happen, not yet incurred.

## Considered options

1. **Freeze the boundary where it stands** — no new language runtimes; the two Python modules are maintained, not ported; new modules are TypeScript by default; cross-boundary contracts stay language-agnostic.
2. **Rewrite `master-data` and `opd` to TypeScript now** — standardise on a single language, eliminate the mirror SDKs.
3. **Embrace polyglot freely** — treat language as a per-module free choice; add Python (or other) surfaces whenever a developer prefers it.

## Decision outcome

Chosen option: **Option 1 — freeze the boundary where it stands.** The polyglot surface enumerated above is the permitted surface; it neither grows nor shrinks as part of ordinary work.

The freeze implies these rules:

- **No new language runtimes.** TypeScript and Python are the only two. A third language requires an ADR that supersedes this one.
- **No new Python modules or services.** New modules are TypeScript unless a superseding ADR justifies otherwise with a concrete, OPD-grade ecosystem reason — not "we already have Python."
- **The two Python modules are maintained, not ported.** `master-data` and `opd` stay Python. Rewriting them to TS is explicitly out of scope for cleanup and needs its own decision if ever proposed.
- **Cross-module contracts stay language-agnostic.** Inter-module communication remains generated OpenAPI clients (sync) and events (async), per [ADR-0009](./0009-event-driven-inter-module-communication.md) and [ADR-0016](./0016-polyglot-nx-monorepo-spec-first-contracts.md). **No shared in-process code crosses the language boundary** — no importing across the TS/Python line.
- **Shared domain rules that must exist in both languages are expressed once per language, with an explicit pointer** naming the counterpart as source-of-truth (e.g. a Python validator carries a comment pointing at its TS original, or vice versa). This is the discipline the W4 shared-utilities dedup work (OM14) enforces; the freeze is what keeps the count at two implementations rather than N.

### Consequences

**Positive:**

- **Drift stops in both directions.** "Let's add another Python service" and "let's rewrite Master Data in TS" both now have a documented answer: no, unless you supersede this ADR.
- **OPD keeps its idiomatic FHIR/ABDM stack** (`py-sdk-fhir`) without pressure to reimplement mature Python FHIR tooling in TS.
- **The cross-language cost is capped, not growing.** Two mirror SDKs and one divergent auth path is the ceiling, not a floor that rises with each new module.
- **New-module guidance is unambiguous** — default TypeScript — so scaffolding, CI, and review expectations stay simple for the 7-person team.

**Negative / accepted trade-offs:**

- **We keep a module (`master-data`) whose language has no intrinsic justification.** We accept the ongoing mirror-SDK and divergent-auth cost for it rather than spend a rewrite we can't justify functionally.
- **We forgo single-language standardisation** and its benefits: one toolchain, one dependency graph, one PEP implementation, no mirror SDKs to keep in lockstep.
- **The freeze is a rule, not a mechanism.** It is enforced by review, not by tooling; a reviewer must catch a new `pyproject.toml` in a module PR and cite this ADR.

**Follow-up actions:**

- [ ] Reference this ADR in `CLAUDE.md` and the monorepo-setup LLD's "adding a module" guidance so "new modules are TypeScript by default" is discoverable at scaffold time. — leads
- [ ] W4/OM14: for every domain rule that legitimately exists in both languages, add the one-line source-of-truth pointer; record the inventory in the cleanup master map. — cleanup owner
- [ ] If a future module presents an OPD-grade ecosystem reason for Python (or any new language), write the superseding ADR *before* the `pyproject.toml` lands, not after. — proposer

## Pros and cons of the options

### Option 1 — Freeze the boundary (chosen)

- *Good:* Caps a real, already-paid cost instead of letting it compound.
- *Good:* Honours the org's polyglot constraint (ADR-0016 unreopened) while giving new work a single default.
- *Good:* Keeps OPD's justified Python stack; keeps Master Data working with zero rewrite spend.
- *Bad:* Preserves Master Data's unjustified language choice indefinitely.
- *Bad:* Enforced by review discipline, not tooling.

### Option 2 — Rewrite `master-data` + `opd` to TypeScript

- *Good:* One language, one toolchain, one PEP; deletes both mirror SDKs and the divergent auth path.
- *Bad:* Large, functionally payoff-free project — porting shipped, tested code (schema, migrations, handlers, tests) for OPD *and* Master Data.
- *Bad:* Reintroduces the exact FHIR/ABDM tooling gap ADR-0023 solved in Python; OPD would need a TS FHIR path to reach parity.
- *Bad:* Not cleanup's job, and the org constraint means polyglot is permitted anyway — so the rewrite buys standardisation we're not required to have.

### Option 3 — Embrace polyglot freely

- *Good:* Maximum per-developer freedom; no friction adding a preferred-language module.
- *Bad:* Multiplies the mirror-SDK, divergent-auth, and dual-CI cost with every new surface — the precise cost the freeze contains.
- *Bad:* "We already have Python" is self-justifying and unbounded; boundaries drift one cheap increment at a time.
- *Bad:* Undermines language-agnostic-contract discipline as in-process temptations grow across a widening boundary.

## Links

- Related ADRs:
  - [ADR-0016 — Polyglot Nx monorepo, spec-first contracts](./0016-polyglot-nx-monorepo-spec-first-contracts.md) (the decision this one bounds; not reopened)
  - [ADR-0009 — Event-driven inter-module communication](./0009-event-driven-inter-module-communication.md) (language-agnostic contract channel)
  - [ADR-0023 — Distributed FHIR assembly](./0023-distributed-fhir-assembly.md) (why OPD's Python FHIR stack exists)
  - [ADR-0017 — InProcessEventBus for Phase 0](./0017-in-process-event-bus-phase-0.md) (TS-only bus the Python modules cannot join in-process)
- Related LLD: [Unified service authentication §6 — Polyglot services (Master Data — Python)](../lld/platform-security/01-unified-service-authentication.md)
- Evidence: `modules/master-data/pyproject.toml`, `modules/opd/pyproject.toml`, `modules/opd/README.md`, `packages/py-sdk-fhir/README.md`, `packages/py-sdk-authz/pyproject.toml`, `modules/empi/src/lib/indian-phone.ts`
- Related cleanup: `docs/architecture/cleanup/00-cleanup-master-map.md` (W4 shared-utilities dedup / OM14)
