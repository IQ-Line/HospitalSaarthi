# HIMS Architecture Documentation — Handoff

This document is the entry point for a Claude Code session continuing work that began in a Claude.ai conversation. The user is the engineer driving this. They have a local git repo. They have a presentation in 5–8 hours and need a defensible architectural starting point by morning, then will iterate post-meeting.

The document is split into two parts:

- **Part A — Morning meeting target.** What must be done before the presentation. This is the focus of the first session(s).
- **Part B — Post-meeting backlog.** Work that completes the architecture document set but is not load-bearing for the morning.

Read Part A end to end before starting any work. Skim Part B so you understand what is intentionally deferred.

---

## Part A — Morning meeting target

### A.1 What "done" looks like for the morning

The meeting's real goal is alignment on architectural foundations: the four core platform modules, the template every feature module must follow, and the cross-cutting stories (identity/access, multi-tenancy, external integration). If the user walks out with these agreed, the 38 feature modules can be designed by their owning teams using the template — that is the unblock the meeting is actually trying to achieve.

By the time the user opens the repo in the meeting, they should have:

1. Repo structure in place, with README, glossary, ADR template, and meta-ADR (ADR-0001).
2. **`hld/01-system-overview.md`** — the narrative the user walks the room through. The big picture, shape constraints, layer model (identity / control / reference / operational planes), four core modules at a high level, multi-tenancy summary, audit summary, deployment topologies summary.
3. **`hld/02-core-modules.md`** — each of the four core modules in depth: purpose, owns, exposes, depends on, failure-mode behavior. Includes the EMPI rationale (this is the user's most consequential proposed addition vs. the EM's original three).
4. **`hld/03-module-shape-template.md`** — the template every feature module must follow. PEP middleware, identity adapter, Cerbos sidecar, data ownership, event publication, configurator integration, FHIR/HL7 boundaries. **This is the highest-value document for the meeting.**
5. **`hld/04-authn-authz-flow.md`** — end-to-end identity and access narrative. Login → token → request → BFF signature verification → module token verification → principal construction → Cerbos check → audit. Both user-facing and service-to-service cases. Includes the policy-as-code / data-as-config split.
6. **`hld/05-integration-and-interop.md`** — Integration Hub (inbound + outbound + shared control plane), FHIR/HL7 boundary contracts, the external-hospital-with-legacy story, ABDM/ABHA mention.
7. **Skeleton ADRs** for the load-bearing decisions:
   - ADR-0002: Multi-tenant, fragmentable adoption (the shape constraint that drives everything)
   - ADR-0003: AuthN with better-auth + identity adapter pattern
   - ADR-0004: AuthZ with Cerbos sidecar
   - ADR-0005: Policy-as-code, permission-data-as-config split
   - ADR-0006: Four core platform modules (including EMPI rationale)
   - ADR-0007: EMPI as a dedicated platform service
   - ADR-0008: Module shape and boundaries
   - ADR-0009: Event-driven inter-module communication
   - ADR-0010: FHIR/HL7 as interop standards
   - ADR-0011: Integration Hub split (inbound/outbound, shared control plane)
   - ADR-0012: Multi-tenancy isolation strategy
   - ADR-0015: BFF role and zero-trust between modules

   **Skeleton ≠ stub.** Each ADR has: context, decision drivers, at least three considered options (real alternatives, not strawmen), the chosen option with one-paragraph rationale, top three positive consequences, top three trade-offs, and at least one cited source where applicable. Full pros/cons tables and exhaustive citations can come later.

8. **Diagrams** — seven diagrams, embedded in the relevant HLD sections. The first five are the morning baseline; the last two are added if P3 finishes early.
   - **System context** (Excalidraw): the four core modules + feature modules + tenants + external systems + the BFF and Integration Hub. The "one slide that shows everything."
   - **Module anatomy** (Excalidraw): one feature module pod, internals, Cerbos sidecar over loopback, identity adapter, event publisher. Use AKS-specific vocabulary where relevant (pod, sidecar container, loopback gRPC).
   - **OPD patient registration sequence** (Mermaid): the canonical flow. Front-desk staff registers a walk-in patient → BFF token verification → OPD module → EMPI dedup check → patient created or matched → audit. Exercises AuthN, AuthZ, EMPI, tenant context, and audit in one diagram. **This is the diagram that grounds the meeting in a familiar clinical workflow rather than an abstract "view a record" example.** If the user wants to swap to OPD consultation visit-pad instead, confirm at start of P3.
   - **External hospital fragmented adoption** (Mermaid): legacy HIS calling the inbound gateway → Pharmacy module. Demonstrates the fragmented adoption story end-to-end.
   - **Tenant onboarding sequence** (Mermaid): new hospital signs up → configurator provisions tenant_id, schemas, Cerbos scope, initial admin → modules pull config → ready. Demonstrates the configurator's role and the "how does a new hospital come on board" question.
   - **Service-to-service AuthZ sequence** (Mermaid, if P3 finishes early): OPD module placing a lab order → calls Lab module with service-account token → Lab's PEP checks Cerbos with kind:service principal → ALLOW → order accepted. Demonstrates that Cerbos governs non-human principals too.
   - **Break-glass / emergency override sequence** (Mermaid, if time allows after P3): doctor triggers emergency access to a record outside normal scope → Cerbos policy requires reason + post-hoc review → audit captures full context. Clinically resonant, demonstrates policy-as-code / data-as-config concretely.

9. **Open questions list** at the top of the system overview, naming the unresolved decisions explicitly. A presentation with three honest open questions is much stronger than one that papers over uncertainty. Your EM will respect the former and pick apart the latter.

That set is the morning target. Anything beyond it goes in Part B.

### A.2 Phased work order

Five phases, in order. Subagents can parallelize within a phase but **not across phases** — each phase produces input the next phase depends on. Total time budget: ~4.5–5.5 hours, leaving buffer in a 5-productive-hour window.

#### A.P0 — Repo setup (single sequential task, ~30 min)

- Confirm with the user: repo path, whether docs go at root or in `docs/architecture/`.
- Confirm: any existing docs in the repo, any AIIMS EOI document available locally to reference.
- Create directory structure (see §A.3).
- Land `README.md`, `glossary.md`, `adr/0000-template.md`, `adr/0001-record-architecture-decisions.md` (provided).
- Commit. Stop and check in with user before proceeding.

#### A.P1 — HLD prose first drafts (parallelizable across subagents, ~1.5–2 hr)

The five HLD documents listed in §A.1 (items 2–6). Prose only, no diagrams yet. Diagrams come in P3 once prose is stable.

Subagent split suggestion:
- Agent A: `01-system-overview.md` and `02-core-modules.md` (these share heavily and should be written together).
- Agent B: `03-module-shape-template.md` (the highest-value doc, deserves dedicated focus).
- Agent C: `04-authn-authz-flow.md` and `05-integration-and-interop.md`.

Each agent reads HANDOFF Part A (especially §A.5 prior decisions and §A.6 conventions) before starting. After all three agents complete, the main session reviews for consistency, fixes cross-links, and resolves contradictions. The user reviews before P2.

**Definition of done:** five HLD prose docs, internally consistent, cross-linked. Marked TODOs where ADR links and diagrams will go.

#### A.P2 — Skeleton ADRs (parallelizable, ~1–1.5 hr)

The 12 ADRs listed in §A.1 item 7. Skeleton-level per the spec there.

Subagent split: ADRs are independent; assign 3–4 per agent. **One discipline:** every ADR must reference the HLD section that motivates it, and the HLD section gets a backlink. Bidirectional linking is non-negotiable — the navigation is the value.

**Definition of done:** 12 skeleton ADRs, each with three considered options, each with at least one cited source, each bidirectionally linked from the HLD.

#### A.P3 — Diagrams (sequential, ~1–1.5 hr)

The diagrams listed in §A.1 item 8. Sequential because they share a visual vocabulary that should be consistent across diagrams (same colors for the same module categories, same shape for "external system," etc.).

**Priority order — produce in this sequence so a partial result is still useful:**

1. System context (Excalidraw) — must-have, anchors the meeting.
2. OPD patient registration sequence (Mermaid) — must-have, the canonical clinical flow. Confirm with the user at start of P3 whether this stays as patient registration or switches to OPD consultation visit-pad.
3. Module anatomy (Excalidraw) — must-have, anchors the module shape template doc.
4. External hospital fragmented adoption (Mermaid) — must-have, the differentiator.
5. Tenant onboarding (Mermaid) — must-have, answers the "how do new hospitals come on board" question.
6. Service-to-service AuthZ (Mermaid) — produce if 1–5 are done within ~1 hr.
7. Break-glass (Mermaid) — produce only if 1–6 are all done and there's time before P4.

If you're behind on time, ship 1–5 cleanly rather than 1–7 hastily. A partial diagram set with the must-haves is better than seven rushed diagrams.

Mermaid diagrams as `.mmd` files in `diagrams/mermaid/` and embedded directly in the HLD using Mermaid code blocks (GitHub renders these inline). Excalidraw as `.excalidraw` files in `diagrams/excalidraw/` with PNG exports embedded in the HLD. Always commit both source and PNG for Excalidraw.

**Definition of done:** at minimum diagrams 1–5 are committed and embedded; 6 and 7 if time allows.

#### A.P4 — Pass for presentation polish (sequential, ~30–45 min)

- Read the system overview end to end as a presenter would. Fix anywhere the narrative jumps.
- Verify every claim that asserts external fact has a citation, or is marked as assumption.
- Verify every "we will" statement maps to an ADR; soften or move to open questions if not.
- Update the open questions list at the top of the system overview.
- Add a one-page **executive summary** at the top of the system overview: three paragraphs that the user can read aloud as the meeting opening.

**Definition of done:** the system overview is presentable as the entry point for the meeting.

### A.3 Repo layout (P0 creates this)

```
.
├── README.md
├── HANDOFF.md
├── adr/
│   ├── README.md
│   ├── 0000-template.md
│   └── 0001-record-architecture-decisions.md  (more added in P2)
├── hld/
│   ├── README.md
│   ├── 01-system-overview.md
│   ├── 02-core-modules.md
│   ├── 03-module-shape-template.md
│   ├── 04-authn-authz-flow.md
│   └── 05-integration-and-interop.md
├── diagrams/
│   ├── mermaid/
│   └── excalidraw/
└── glossary.md
```

Directories not listed (`lld/`, `flows/`, `references/`) are created in Part B work, not now.

### A.4 What is intentionally **not** in the morning scope

The user explicitly does not need the following by morning. Do not produce them in P0–P4.

- Full LLDs for any module (a *sketch* of one is acceptable inside the module shape template doc as a worked example, but a dedicated `lld/pharmacy-module.md` is post-meeting).
- ADRs for: frontend strategy, audit/compliance details, event bus technology choice, deployment platform.
- Documents for: deployment topologies (the standalone doc), additional flows beyond the seven in §A.1 (e.g. consent revocation, cross-tenant referral), multi-tenancy as a standalone doc (covered in system overview).
- A curated final architecture document (the "Phase 5" in the original plan).
- Annotated bibliography in `references/`. Citations live inline in ADRs and HLDs for now.
- Comprehensive glossary expansion. The starter glossary covers what's needed; add terms as they appear in writing.

If a subagent is about to produce one of these, it has misread the scope. Stop and check.

### A.5 Decisions already made (do not relitigate)

These were settled in conversation. Treat as input. If new evidence surfaces a problem with one, raise it explicitly with the user — do not silently change direction.

**Identity, access, audit:**

- AuthN: `better-auth`, wrapped behind a thin `IdentityProvider` interface so modules can also be configured to federate to external IdPs (Entra/AD, Okta, Keycloak, hospital SSO).
- AuthZ: Cerbos, deployed as a **sidecar per module pod** communicating over loopback gRPC. Logical view (one policy authority) and physical view (PDP per pod) both appear in diagrams.
- Cerbos policies are code (YAML, Git-versioned, CI-tested via `cerbos test`). Permission *data* is UI-configurable (roles, role assignments, department/ward hierarchies, tenant-specific scope overrides).
- N+1 mitigation: bulk `CheckResources` for list views, `PlanResources` to push authorization filters into SQL `WHERE` clauses, request-scoped PEP caching.
- BFF / API Gateway: signature verification only (JWT/JWKS). Does **not** perform fine-grained AuthZ. BFF is an optimization, not a security boundary; modules verify tokens themselves. Zero-trust between modules.
- Cerbos principals are not just users. Service accounts, organizations (hospitals), partner systems, automated agents all flow through the same policy substrate. Tenant isolation is a base policy that all resource policies inherit.
- User Management retains a shadow record of every user who ever acted on the system, including federated users, indefinitely — for audit chain-of-custody. JIT provisioning on first login, SCIM updates where supported.

**Core platform modules (the always-on four):**

1. **User Management** — identity of system users (humans, service accounts). Wraps `better-auth`. Owns shadow records for federated users. Owns roles and role assignments (the *data* Cerbos policies evaluate against).
2. **EMPI / Patient Identity** — identity of subjects of care. Owns canonical patient records, identity resolution / deduplication, cross-system linking (internal ID ↔ ABHA ↔ legacy MRN ↔ insurance ID). **Added during the conversation; the EM's original list had three. The user will raise this with the EM.**
3. **Configurator** — control plane. Tenant provisioning, feature flags, module enablement, integration profiles, module-config UI rendering. Has its own admin UI.
4. **Master & Tenant Data** — reference data (ICD codes, drug catalog, procedure codes) plus tenant-level overrides. Read-mostly, cache-aggressively. One module with an inheritance model.

Failure of Configurator or Master Data must degrade gracefully — modules cache config and reference data with TTLs.

**Module shape (every feature module and each core module):**

- Independently deployable as a pod containing the module service + Cerbos PDP sidecar + identity adapter.
- Owns its own database / schema. No cross-module foreign keys. Shared entities (patients, etc.) are projections synced via events.
- Communicates with other modules via events (default), FHIR R4 at clinical boundaries (preferred standard), HL7v2 for legacy, generic JSON last resort. Synchronous inter-module HTTP calls are exception, not rule.
- Ships PEP middleware that wraps the Cerbos call.

**Multi-tenancy:**

- `tenant_id` (or `hospital_id`) is a JWT claim, validated on every request.
- Default data isolation: shared DB, tenant differentiator column. Can be isolated on hardware level by citus/sharding depending on db choice.
- Tenant-specific authorization rules expressed as Cerbos scopes, not policy forks.

**External integration:**

- One logical Integration Hub, two runtime services: Inbound Gateway (external systems calling in) and Outbound Connector (platform calling external systems like ABDM, insurers, state reporting). (Note by dev: this may need some partial rethinking as a lot of ABDM flows are initiated by ABDM/NHA externally or other Health-Information-Users)
- Share a control plane: integration registry, mapping/translation engine, credentials vault, observability surface, audit stream, configurator UI.

**Frontend:**

- Single UI app for now, microfrontend-ready architecture.
- Per-module code isolation, lazy-loaded routes per module, shared design system (default: shadcn/ui + Tailwind + design tokens), generated typed API client, no global mutable state.

**Deployment target:**

- **Azure Kubernetes Service (AKS)** is the assumed deployment target. The architecture itself is cloud-agnostic at the conceptual level (the patterns — sidecar, event-driven, schema-per-tenant — work on any Kubernetes), but where concrete examples or vocabulary matter, prefer AKS-native services as the default illustration:
  - Identity: Microsoft Entra ID (formerly Azure AD) as a concrete external IdP example for the federation story.
  - Credentials vault for the Integration Hub: Azure Key Vault.
  - Event bus candidate (still an open ADR): Azure Service Bus or Event Hubs as the Azure-native options, alongside Kafka/NATS/RabbitMQ.
  - Database: Azure Database for PostgreSQL Flexible Server is the path-of-least-resistance default; document this assumption inline where module data ownership is discussed.
- Avoid phrasing that assumes a different cloud (no AWS/GCP-only references). Where a cloud-neutral term works ("managed Postgres," "managed message broker"), prefer it; reach for AKS-specific terms when illustrating concrete options.

### A.6 Conventions (apply throughout)

- **One claim per paragraph.** If you find yourself writing "Also, …", that's a new paragraph or new section.
- **Cite when asserting external fact.** Internal decisions don't need citations; claims about technology behavior do. "Cerbos evaluates policies in-memory" needs a Cerbos docs link. "FHIR R4 is current normative" needs an HL7 link.
- **Prefer "we will" to "we should."** ADRs record decisions, not aspirations. If undecided, mark as open question.
- **Mark assumptions explicitly** inline (e.g., "assuming Kubernetes deployment").
- **Use the glossary.** First use of acronym in any document expands it; subsequent uses don't.
- **No marketing voice.** "Robust, scalable, enterprise-grade" are filler. Say what the system does.
- **Internal cross-links are first-class.** ADRs link to HLD sections that motivate them; HLD sections link back to ADRs.

### A.7 Source quality bar

**Strong sources** (load-bearing):

- Official project docs: Cerbos (`docs.cerbos.dev`), better-auth (`better-auth.com/docs`), HL7 FHIR (`hl7.org/fhir`).
- Standards bodies: NIST (SP 800-63 for digital identity, SP 800-162 for ABAC), HL7, ISO.
- ABDM / NHA published specs (`abdm.gov.in`).
- Cloud architecture references: AWS Well-Architected, Microsoft multi-tenant SaaS guidance, Google Cloud architecture framework.
- Foundational books cited by name and chapter: Newman's *Building Microservices*, Kleppmann's *Designing Data-Intensive Applications*, Richardson's *Microservices Patterns*.

**Acceptable as supporting** (sparingly):

- Engineering blogs from companies that operate the technology in production.
- Conference talks with public recordings.

**Avoid:**

- Medium articles, Dev.to posts, generic consultancy blogs as primary citations.
- LinkedIn posts.
- Anonymous tutorial sites.

**Time pressure caveat:** for the morning, aim for 1–2 strong cited sources per ADR. A skeleton ADR with two solid citations beats a polished ADR with eight unread links. Quality of citations > quantity.

### A.8 Diagrams — Mermaid vs Excalidraw

Mermaid for: sequence diagrams, ER diagrams, state diagrams, simple flowcharts. Anything that benefits from being diff-able in PRs.

Excalidraw for: layouts where layout itself carries meaning (system context, deployment topology, module anatomy with grouped boxes), free-form annotation, presentation-tone diagrams.

For the morning diagrams: System context (Excalidraw), Module anatomy (Excalidraw), and the rest (Mermaid sequences). Two Excalidraw, five Mermaid total at the maximum count.

For Mermaid: keep diagrams under ~12 nodes. Two simpler diagrams beat one busy diagram. For Excalidraw: pick a 3-color palette and stick to it across all Excalidraw diagrams (e.g. core modules one color, feature modules another, external systems a third).

### A.9 Time-pressure rules

- **Don't stall on missing decisions.** If a section needs a decision the user hasn't made, mark as `[OPEN: needs decision — see §A.10]` and keep moving.
- **First-draft quality is fine.** Wordsmithing in the last hour at the cost of a missing diagram is a bad trade.
- **Don't try to pre-empt every objection.** The user will be in the room. Open questions defended in real time beat over-engineered prose.
- **Stop and check in** at the end of each phase. The user is the bottleneck on review; producing P3 work the user hasn't reviewed P2 of is wasted effort.
- **Subagent caution:** subagents can produce inconsistent terminology across documents. The main session must reconcile after parallel work completes.

### A.10 Open questions to surface in the meeting

These came up in conversation and are genuinely unresolved. Surface them at the top of the system overview document; do not silently decide them.

- **Minimum viable deployment footprint.** Is there a "lite" packaging path (core modules embedded as libraries, not separate services) for very small tenants like single-pharmacy chemists? Confirm with EM.
- **EMPI as a fourth core module.** Conversational consensus, but EM has not signed off. The original list had three core modules.
- **Configurator UI scope.** Likely a separate web app distinct from clinical UIs. Confirm with EM whether it's in initial build or fast-follow.
- **Event bus technology.** Not chosen. Kafka, NATS, RabbitMQ, cloud-managed equivalents all viable. Defer to a dedicated ADR after architectural shape is agreed.
- **Cerbos policy storage.** Git + bundle distribution is the default. Cerbos's Admin API + DB-backed policies is an escape hatch for runtime policy changes. Default: don't enable until evidence demands it.
- **EMPI deduplication algorithm.** Will be its own multi-quarter investment. Start with exact match on (name, DOB, phone); add probabilistic (Fellegi-Sunter family) when real data warrants.

### A.11 First Claude Code session — opening prompt

After this handoff is in the repo, the user opens Claude Code and the prompt can be:

> Read `HANDOFF.md` end to end. Execute Part A. Stop and check in with me at the end of each phase.

That's all that's needed. The handoff carries everything else.

---

## Part B — Post-meeting backlog

After the meeting, with whatever direction comes out of it, the work continues. This section names what's deferred so it's not forgotten.

### B.1 Remaining HLDs

- `hld/06-multi-tenancy.md` — full standalone treatment beyond the system overview summary.
- `hld/07-deployment-topologies.md` — full platform, fragmented, lite (pending EM input on the lite question).

### B.2 Remaining ADRs

- ADR-0013: Frontend strategy (single UI now, MFE-ready).
- ADR-0014: Audit and compliance strategy (HIPAA, DPDP Act).
- Event bus technology ADR (after technology decision).
- Deployment platform ADR (after platform decision).
- Database technology ADR per module (likely defer to per-module LLDs).

### B.3 LLDs (mock, representative)

Two modules, picked because together they stress the architecture:

- **Lab/LIMS** — exercises FHIR boundaries, internal lab analyzer integration, result distribution events, multi-step workflow.
- **Pharmacy** — exercises external integration (legacy chemist systems), drug master data, prescription events from OPD, billing events.

Each LLD covers: data model, API surface (with sample FHIR resources where applicable), Cerbos policy file (sample), events published and consumed, configurator schema declaration, deployment manifest sketch.

### B.4 Additional flows

Already covered in Part A's diagram set (if time allows): tenant onboarding, service-to-service AuthZ, break-glass.

Deferred to Part B:

- Patient consent revocation propagation.
- Cross-tenant referral.
- Lab result distribution to multiple subscribers.
- Discharge workflow (IPD → Pharmacy → Billing).

### B.5 Curated final document

A single top-level "Architecture Decision Record" document — a curated narrative that walks a reader through the architecture decisions, links to all individual ADRs, summarizes rationale, and is the thing the user presents to broader stakeholders (e.g., AIIMS evaluators, exec team).

Structure: Executive Summary → System Shape → Decision Map (table of every ADR with one-line summary and link) → Open Questions → Roadmap → References.

### B.6 References / annotated bibliography

`references/README.md` as an annotated bibliography organized by topic. Pulls together the citations scattered across ADRs and HLDs into a single reference list with brief annotations on what each source contributed and how it was used.

### B.7 Glossary expansion

Continue adding terms as new acronyms appear in writing.

---

## Quick reference: prior conversation in three paragraphs

The user is architecting a multi-module HIMS for the AIIMS EOI scope. We worked through identity (better-auth + Cerbos sidecar pattern, with policies as code and permission data as UI-configurable), the core platform modules (User Management, Configurator, Master/Tenant Data, plus a recommended fourth: EMPI for patient identity), the module shape (independently deployable, event-driven, FHIR/HL7 boundaries, no synchronous inter-module coupling by default), multi-tenancy (tenant_id propagated via JWT, schema-per-tenant default, Cerbos scopes for tenant-specific rules), the integration story (one logical Integration Hub split into Inbound Gateway and Outbound Connector services sharing a control plane), and frontend (single UI now, microfrontend-ready architecture, design system decision should not defer).

The user's central constraint is that hospitals must be able to adopt the platform in fragments — single modules plugged into existing legacy systems, all the way up to the full ~38-module deployment — and this drives almost everything else: standards-based interop, per-module data ownership, no cross-module synchronous dependencies in the default path, identity that federates to external IdPs.

The user is now ready to commit this to a documented architecture draft and has a presentation in 5–8 hours. Part A of this handoff is the morning target. Part B is the backlog after.