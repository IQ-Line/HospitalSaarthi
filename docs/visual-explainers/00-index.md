---
title: HIMS visual explainers — reading map
objective: Thirteen diagram-first pages that together give a developer full working knowledge of how this monorepo actually works — every claim grounded in source on this branch.
---

Each page below is a self-contained explainer: open the `.html` next to it in a browser
(they are fully offline, single-file pages), or read the `.md` directly. Pages cite the
exact source files they were verified against — when a page and the code disagree, the
code moved after 2026-07-10; trust the code and fix the page.

```callout tone=info title="How these were made — and what to trust"
Every page was written by reading the current source (not the ADRs/LLDs), then
adversarially audited: cited paths existence-checked, load-bearing claims re-verified
against code, all Mermaid diagrams machine-rendered. Where an ADR, LLD, or runbook
disagrees with the code, the page says so in a callout — several older docs are stale
and the pages name them.
```

## Suggested reading order

```diagram title="Reading map"
flowchart TD
  A["01 Nx monorepo"] --> B["02 Anatomy of a request"]
  B --> C["03 Identity and AuthZ"]
  A --> D["04 Database and Citus"]
  A --> E["05 Modules, services, events"]
  E --> F["06 Identifiers"]
  C --> G["07 Tenant onboarding"]
  B --> H["08 Frontend architecture"]
  E --> I["09 OPD patient journey"]
  I --> J["10 ABDM M1 ABHA"]
  J --> K["11 ABDM M2 HIP"]
  K --> L["12 ABDM M3 HIU"]
  A --> M["13 Testing strategy"]
```

| # | Page | One-line hook |
|---|------|---------------|
| 01 | [Nx monorepo setup](01-nx-monorepo.md) | 51 projects, hand-authored targets + a CI conformance guard, single-version pnpm catalog, the real CI pipeline stage by stage. |
| 02 | [Anatomy of a request](02-request-lifecycle.md) | One `POST /payments` traced browser → BFF → identity → Cerbos PEP → handler → Drizzle, with every failure short-circuit. |
| 03 | [Identity & Authorization](03-authn-authz.md) | better-auth → live-JOIN capability recipe (ADR-0037, deny-wins) → catalog pipeline → Cerbos PDP + the per-module PEP fleet. |
| 04 | [Database topology](04-database-citus.md) | One Citus cluster, schema-per-module, distributed vs reference tables, disposable migrations, `iq_tenant_id` everywhere. |
| 05 | [Modules, services & events](05-modules-services-events.md) | The module folder contract, 1-module-per-service composition, InProcessEventBus reality check, projection-vs-HTTP doctrine. |
| 06 | [Business identifiers](06-identifier-allocation.md) | UHID / visit / bill numbers: config from configurator over S2S HTTP, counters owned per module, exact formats from the tests. |
| 07 | [Tenant onboarding](07-tenant-onboarding.md) | The 8-phase provisioning sequence, the platform-operator gate, the orphan windows where it can strand partial state. |
| 08 | [Frontend architecture](08-frontend-architecture.md) | TanStack Router routes vs features, the four Zustand stores, cookie session bootstrap, capability-gated UX (Cerbos stays authoritative). |
| 09 | [OPD patient journey](09-opd-clinical-flow.md) | Registration → EMPI → visit → consult → bill → dispense, HTTP-first with inert events — and the honest gaps on that path. |
| 10 | [ABDM M1 — ABHA](10-abdm-m1-abha.md) | ABHA creation/verification: gateway session auth, RSA field encryption, session FSM — fully synchronous, no callbacks yet. |
| 11 | [ABDM M2 — HIP](11-abdm-m2-hip.md) | Discovery, linking, consent notify, and the encrypt-and-push dataflow (real Fidelius crypto), with the FHIR builder split. |
| 12 | [ABDM M3 — HIU](12-abdm-m3-hiu.md) | Consent request → artefact → data fetch → decrypt → store, the 11-state session FSM, and what the mock loop does vs doesn't prove. |
| 13 | [Testing strategy](13-testing-strategy.md) | Five test layers with distinct truth sources, the conventions with teeth, and the integrity bar (never weaken a test). |

```callout tone=decision title="Keeping these honest"
These pages are a snapshot verified against the branch on 2026-07-10. If you change a
mechanism a page describes, update the page in the same PR — the whole point of this
directory is that reading it equals understanding the running system.
```
