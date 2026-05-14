# ADR-0025: Billing module — shape, phasing, and snapshot pricing

- **Status:** Proposed
- **Date:** 2026-05-13
- **Deciders:** [Architect], [Engineering Manager], [Co-Tech-Lead]
- **Related:** [ADR-0006](./0006-four-core-platform-modules.md) (core modules) | [ADR-0008](./0008-module-shape-and-boundaries.md) (module shape) | [ADR-0009](./0009-event-driven-inter-module-communication.md) (events) | [ADR-0012](./0012-multi-tenancy-isolation-strategy.md) (multi-tenancy) | [ADR-0017](./0017-in-process-event-bus-phase-0.md) (Phase 0 bus) | [ADR-0024](./0024-audit-deferred-to-pre-prod.md) (audit deferral)

## Context and problem statement

The platform must support patient-facing revenue-cycle workflows: capturing charges as services are rendered, generating invoices, accepting payments (cash, card, UPI, cheque, gateway, advance), tracking outstanding balances, recording refunds, claiming reimbursement from TPAs/insurers and corporate clients, and (post-launch) running payment plans and computing doctor commissions. The production HIMS bundles all of these into an OPD-coupled module. The build-order doc ([analysis/02-module-build-order.md](../analysis/02-module-build-order.md)) and the AIIMS EOI list it as a distinct concern.

The co-tech-lead has shared a reference ERD (`hospital_billing_.erd.json`, 23 tables, ~30 columns per table on average) covering the full surface area: patients, insurance providers and policies, service master and packages, price agreements, corporate clients, bills and bill items, payments, payment plans and installments, insurance claims, refunds, discount approvals, patient advances and advance utilizations, doctor commission rules, doctor commissions, doctor commission payouts, IPD discharge summaries, and an audit log. The ERD is internally consistent and reflects accepted Indian hospital-billing practice. It does not yet account for the platform's architectural constraints: multi-tenant Citus distribution ([ADR-0012](./0012-multi-tenancy-isolation-strategy.md)), no cross-module foreign keys ([CLAUDE.md](../../../CLAUDE.md): "No cross-module imports."), audit deferral ([ADR-0024](./0024-audit-deferred-to-pre-prod.md)), and the module-shape contract ([HLD 03](../hld/03-module-shape-template.md)).

This ADR decides four things at once because they are entangled:

1. **Where billing lives in the module taxonomy** — is it a fifth-and-a-half core module (always deployed), a supporting module (deployed when adopted), or a feature module no different from any of the ~38 in the EOI?
2. **How billing is packaged for Phase 1** — its own service from day one, or embedded as a library inside the OPD service until a second clinical module needs to emit charges?
3. **The financial-truth principle for line items** — do bill items reference the service catalog by ID and resolve price at view time, or do they snapshot price and tax at charge time and become immutable thereafter?
4. **The phased rollout that gets us to existing-production parity fastest** — which subset of the 23 tables ships first, second, third, and how do we declare a clean Phase 1 cutoff that one developer can ship in a sprint?

The decisions taken here cite the lead's ERD as the source of table names and column intent wherever possible. Departures from that ERD are deliberate and called out.

## Decision drivers

- **Existing-production parity drives Phase 1** ([CEO directive](../../sprint-demo-plan.md) per session memory). The first phase must let an OPD counter operator capture charges, raise a bill, accept cash/card/UPI, generate a receipt, and track outstanding amounts. Anything beyond that is post-parity.
- **No cross-module FKs** ([CLAUDE.md](../../../CLAUDE.md)). `patient_id`, `doctor_id`, `visit_id`, `tenant_id` are soft references resolved by API or projection, never enforced by Postgres FK constraints across module schemas.
- **`iq_tenant_id` on every table, Citus-distributed** ([ADR-0012](./0012-multi-tenancy-isolation-strategy.md)). The lead's ERD has no tenant column; every table in the billing schema must gain one and distribute on it.
- **Financial integrity through snapshots, not catalog stability.** A bill generated in March 2026 must remain a valid statement of fact even if the service catalog updates its prices in April. The integrity invariant is "what the patient was billed and paid is byte-exact what we charged at the time." This argues for snapshotting price, tax rate, item description, and tax category on each `bill_item` row.
- **Module autonomy** ([ADR-0008](./0008-module-shape-and-boundaries.md)). Clinical modules (OPD, IPD, Lab, Pharmacy, Radiology) must not import billing's internals. Charge capture happens via a published HTTP contract that any module can call.
- **Audit substrate without per-module tables** ([ADR-0024](./0024-audit-deferred-to-pre-prod.md)). The lead's ERD includes `billing_audit_log`. We do not build it. Phase 0/1 captures actor and before/after via structured request logs and rich event payloads; the centralized audit consumer projects from these. Refusing to ship a per-module audit table prevents a known throwaway-code trap.
- **Velocity for one developer.** Phase 1 must fit a sprint. Eight to ten tables, a clear state machine, and a single happy-path scenario per bill type is the budget.
- **Operational simplicity over premature service decomposition.** Two-pizza teams own modules, not services. Phase 1 deployment is one process. Billing extracts to its own service when (a) a second clinical module needs to emit charges synchronously and (b) the OPD service's failure surface is harming billing availability — not before.
- **Lead-friendly continuity.** Using the lead's table names, column names, and intent where they fit reduces review friction and signals respect for the work he already did. Departures are confined to the structural rules above and are individually justified.
- **Polyglot-ready** ([ADR-0016](./0016-polyglot-nx-monorepo-spec-first-contracts.md)). Charges may eventually be emitted by Python clinical modules. The HTTP charge-ingest contract works for both runtimes; an embedded TypeScript-only library would not.

## Considered options

### Option A — Billing as a sixth core module, always deployed

Billing ships with every tenant from day one. Schema is owned. Service is always-on. Same shape as User Management or EMPI.

Rejected for two reasons. First, not every prospective HIMS deployment uses our billing. Teaching-hospital tenants with bundled-cost arrangements and tenants integrating an external billing/ERP system both exist in the prospect pipeline. Forcing billing on every deployment violates the [ADR-0002 fragmentable-adoption principle](./0002-multi-tenant-fragmentable-adoption.md). Second, "core" status is reserved for substrates that other modules cannot function without (identity, patient identity, configuration, reference data, clinical record substrate). Billing is downstream of clinical events, not a substrate for them.

### Option B — Real-time price resolution at view time

`bill_items` reference `service_master` by `service_code`. Each rendering of the bill (UI, PDF, invoice export) looks up current price and tax. No snapshot.

Rejected. Catalog mutations would silently restate historical bills. Re-issuing a paid invoice with a different total because the catalog changed is unacceptable medico-legally and confusing to the patient. Even if the catalog is "carefully managed," the architecture should not depend on careful management for financial truth.

### Option C — Monolithic finance suite (billing + accounts-receivable + general-ledger + payroll)

A single module covering the full hospital-finance surface.

Rejected as scope creep. HIMS billing handles patient-facing revenue cycle. General ledger, financial reporting, vendor payments, payroll, and statutory filings belong in an ERP that integrates with billing via an exports contract (Tally, SAP, Zoho Books). Doctor-commission *computation* is in scope (it derives from billing data), doctor-commission *payouts as bank transfers* are not.

### Option D — Charges remain in clinical modules; billing is a thin read-side view

OPD owns the OPD-charge rows. IPD owns the IPD-charge rows. Billing renders a unified view.

Rejected. Financial integrity requires charges to be immutable once invoiced. Clinical rows are reasonably mutable (correction of a procedure code, amendment of a prescription line). A view layered over mutable rows cannot offer the invariant "what the patient owes does not change because a clinical note was corrected." Charge capture must move into a financial schema at the moment of billing, where it becomes immutable from amendment.

### Option E — Billing as a horizontal supporting module, embedded-then-extracted

Billing has its own schema (`billing`) and its own module (`modules/billing/`), but for Phase 1 it is *embedded as a library inside `services/opd-svc`* — the OPD service mounts billing's router under its HTTP wrapper, billing's tables live in the same Postgres cluster as OPD's, and they share a process. Same `billing.*` schema and same code, deployed wherever needed.

Extraction to `services/billing-svc` happens when both of these conditions hold: (a) a second clinical module (e.g., IPD or Lab) needs to emit charges, and (b) operational pressure (deployment frequency, failure isolation, scaling) justifies the split. Until then, the in-process integration is faster, cheaper, and easier to debug.

This is the chosen option.

## Decision outcome

Chosen option: **E — billing as a horizontal supporting module, embedded-then-extracted, with snapshot pricing on bill items.**

### Module taxonomy

| Category | Module | Always deployed? |
|---|---|---|
| Core platform | User Management, EMPI, Configurator, Master & Tenant Data, Record Foundation | Yes |
| Platform infrastructure | Integration Hub | Yes |
| **Horizontal supporting** | **Billing** | **No — deployed when tenant adopts patient-facing revenue cycle** |
| Feature (clinical) | OPD, IPD, Lab, Pharmacy, Radiology, ... | No — deployed per tenant adoption |

"Horizontal supporting" means cross-cutting across clinical modules but not part of the substrate. A horizontal supporting module is a peer of feature modules in deployment but tends to be present in most adoptions. It follows the standard [module shape](../hld/03-module-shape-template.md).

### Packaging — Phase 1 vs extraction

| Phase | Where billing's code runs | Where billing's schema lives | Trigger to advance |
|---|---|---|---|
| **Phase 1 (embedded)** | Mounted inside `services/opd-svc` as a library; same Fastify instance; same Postgres connection pool | `billing` schema in the same database cluster as OPD | A second clinical module needs to emit charges OR ops calls for failure isolation |
| **Phase 2+ (extracted)** | Own service: `services/billing-svc` | `billing` schema, same cluster (no data migration; just a connection re-point) | — |

No data migration on extraction because the schema name does not change and Postgres roles can be granted across services. The only code change is wiring billing's router into a new Fastify entrypoint and giving each clinical module the billing service's URL via its [Configurator integration profile](../hld/02-core-modules.md#3-configurator).

### Snapshot-pricing principle

Every `bill_item` row carries a snapshot of pricing fields *at the moment the charge was captured*:

- `item_code` (from `service_master.service_code` or `service_packages.package_code` at capture)
- `description` (from `service_master.service_name` or `service_packages.package_name`)
- `unit_price` (from the resolved price after applying any active `price_agreements`)
- `tax_percentage`, `tax_category` (from `service_master` at capture)
- `is_insurance_covered` (from `service_master` at capture)

Updates to `service_master` after the bill_item row is written do not propagate to that row. The lead's ERD already implies this (it has `bill_items.unit_price` as a column rather than a join), but this ADR makes the principle explicit and binding: **once a `bill_item` exists, its financial fields are immutable.** Amendment is via the bill-replacement chain (`bills.replaced_bill_id`), not via in-place edit.

### Phasing — what ships when

The lead's 23 tables divide into four phases based on what is needed to reach parity with the production HIMS counter-billing workflow versus what extends beyond it.

**Phase 1 is deliberately the minimal set the existing production OPD counter flow uses** — four tables. The reasoning is that the EM and tech-lead's mental model is shaped by what the production HIMS already does, and presenting Phase 1 as anything more than that risks push-back ("why so many tables for one screen?") without commensurate benefit, because Phase 1's *behaviour* is already constrained to that flow. The four tables are enough; everything beyond is Phase 2+ because Phase 2+ is where new product surface lands.

| Phase | Goal | Tables ship (lead's names preserved unless noted) |
|---|---|---|
| **Phase 1 — Counter billing parity** | OPD counter operator can find/create patient (EMPI), capture conditional registration fee + per-doctor consultation fee, apply a single bill-level discount %, accept a single payment (cash/card/UPI/cheque) where amount paid must equal total, finalize the bill in one Create-Visit transaction, print a receipt. Reaches feature-parity with the production HIMS OPD counter flow. | `service_master`, `bills`, `bill_items`, `payments` (4 tables). |
| **Phase 2 — Insurance, corporate, packages, advances, discount approvals, price agreements** | TPA/insurance cashless and reimbursement flows; corporate-client agreements with credit-day terms; product packages; patient advances + advance-utilisation; discount-approval workflow; price-agreement-based pricing overrides (replaces Phase 1's lazy-explosion catalog). | `price_agreements`, `patient_advances`, `advance_utilizations`, `discount_approvals`, `insurance_providers`, `patient_insurance_policies`, `insurance_claims`, `corporate_clients`, `service_packages`, `package_items` (10 tables added). |
| **Phase 3 — Refunds, payment plans, IPD final bills** | Discharge billing for IPD, payment-plan support for high-value cases, refunds workflow with approval. | `refunds`, `payment_plans`, `installments`, `ipd_discharge_summaries` |
| **Phase 4 — Provider economics** | Doctor commission rules, accruals on each billable service, periodic payout reconciliation. | `doctor_commission_rules`, `doctor_commissions`, `doctor_commission_payouts` |

The phasing is *additive*: every table ships with its eventual full set of columns where they are knowable at the phase boundary, with later-phase columns added as nullable where they are not. No data migration risk on advancing a phase.

**Phase 2 absorbs four tables that an earlier revision of this ADR placed in Phase 1** (`price_agreements`, `patient_advances`, `advance_utilizations`, `discount_approvals`). Each was demoted for a specific reason rooted in the existing-production flow:

| Demoted to Phase 2 | Why not Phase 1 |
|---|---|
| `price_agreements` | Phase 1 has no real "agreement" — only per-doctor consultation prices, which the catalog handles directly via lazy explosion (see below). The agreement abstraction earns its keep when corporate clients and TPAs arrive in Phase 2 with negotiated rates. |
| `patient_advances` + `advance_utilizations` | The existing OPD counter flow does not take advances — patients pay the total at registration. The first real advance use case is IPD admission deposit, which arrives no earlier than Phase 2. |
| `discount_approvals` | The existing flow has no approval workflow — the frontdesk operator types in any discount percentage. Threshold-based approvals are a product feature, not a parity requirement. Bill-level discount fields (`discount_amount`, `discount_percentage`, `discount_reason`) remain on `bills` so Phase 1 can still record the discount. |

`service_packages` and `package_items` are placed in Phase 2 because the OPD counter parity flow does not require packages — packages are a marketing/preventive-care construct (master-health-checkup bundles) and add UX complexity that Phase 1 does not need.

### Phase 1 per-doctor consultation pricing — lazy explosion

Without `price_agreements` in Phase 1, per-doctor consultation pricing is encoded by **one `service_master` row per (consultation type, doctor)** combination:

| service_code | service_name | base_price |
|---|---|---|
| `REG_FEE` | Registration Fee (first visit) | 100.00 |
| `CONS_GENERAL_DR_SMITH` | General Consultation — Dr Smith | 500.00 |
| `CONS_GENERAL_DR_JONES` | General Consultation — Dr Jones | 700.00 |
| `CONS_SPECIALIST_DR_KUMAR` | Specialist Consultation — Dr Kumar | 1200.00 |
| `PROC_DRESSING` | Wound Dressing | 200.00 |
| `PROC_INJECTION` | IM Injection | 80.00 |

Catalog cardinality is bounded (≤ 20 rows for the demo tenant). The frontdesk UI maps "Doctor: <dropdown>" → looks up the corresponding consultation service code → calls `POST /v1/billing/charges`. This is what the production HIMS does in practice; every dev recognises the pattern instantly; the EM/tech-lead read this and say "yes, this is what we have today."

When Phase 2 introduces `price_agreements`, the existing service rows do not change. Per-doctor consultation rows can remain (the agreement abstraction is opt-in), or be folded into a single `CONS_GENERAL` row with `DOCTOR_OVERRIDE` agreements — that's a catalog-cleanup migration the Phase 2 team owns. Either way, **snapshot pricing on `bill_items` means historical bills are unaffected** by any such Phase 2 catalog reorganisation.

### Why this matches the existing-production frontdesk flow exactly

The production HIMS OPD frontdesk page does this:

1. Operator types patient identifier (mobile / ABHA / patient code) → system finds the patient (EMPI) or kicks off a registration form for a new patient.
2. If new patient: a `REG_FEE` line is added automatically; if the patient has visited before, this line is suppressed.
3. Operator selects the consulting doctor from a dropdown; the corresponding consultation service is added as a line.
4. If the prior visit was eligible for a free follow-up, the consultation line is suppressed (the OPD module's visit-creation logic decides this).
5. Operator can add additional service lines (procedure, basic lab, basic imaging).
6. Operator enters a discount percentage (free-form, no approval). The bill total recomputes.
7. Operator enters the payment mode (radio: cash / card / UPI / cheque) and the amount paid. The "Create Visit" button is disabled until `amount_paid == net_amount`.
8. On Create-Visit click: the bill finalizes (DRAFT → FINALIZED), the payment is recorded (status SUCCESS), the bill auto-transitions to PAID (`paid_amount == net_amount`), the OPD module creates the visit row, and a receipt prints.

Steps 1–6 are charge ingestion; step 7 is the discount and payment capture; step 8 is finalize + record-payment in a single transaction. None of those steps need advances, price-agreements, or a discount-approval workflow. They all map to operations on the four Phase 1 tables.

### Deliberate departures from the lead's ERD

These are recorded once here and cited from the LLD; the LLD does not re-justify them per table.

| Lead's ERD element | Departure | Justification |
|---|---|---|
| `patients` table | **Removed from billing schema.** Billing carries `patient_id UUID` as a soft reference to EMPI. | [CLAUDE.md](../../../CLAUDE.md) — no cross-module owns of patient identity. EMPI is the source of truth ([ADR-0007](./0007-empi-dedicated-platform-service.md)). For invoice rendering, the billing service calls EMPI for display fields (name, ABHA, phone) or reads a TTL cache ([feedback_projection_vs_http_cache](../../../README.md)). |
| `billing_audit_log` table | **Not built.** | [ADR-0024](./0024-audit-deferred-to-pre-prod.md). Audit substrate is captured by structured request logs and rich event payloads; the centralized audit consumer is the target architecture. |
| Tenant column | **Added.** Every table gains `iq_tenant_id UUID NOT NULL` and is Citus-distributed on it. Reference tables (`service_master`, `insurance_providers`) carry it for tenant-scoped overrides. | [ADR-0012](./0012-multi-tenancy-isolation-strategy.md). |
| `visit_id` and `visit_type` on `bills` | **Generalized to `source_module` + `source_ref` pair on `bill_items`, with the existing `visit_id` retained on `bills` as the dominant grouping key.** | A `bill` groups items from a single visit, but individual items may originate from different modules (a single OPD visit produces consultation charges from OPD, lab charges from Lab, pharmacy charges from Pharmacy). The `source_module`/`source_ref` pair on `bill_items` captures origin without violating module boundaries. |
| `doctor_id`, `service_id`, `package_id`, `policy_id`, `provider_id` as FKs | **Soft references only.** | No cross-module FKs. Referential integrity is checked at the application layer at write time; orphaning is acceptable in disaster scenarios because billing's financial truth is internal. |
| `service_master` location | **Stays in `billing` schema for Phase 1.** Possible migration to a Master Data service-catalog domain post-launch. | Adding cross-module catalog coupling in Phase 1 increases risk. Snapshot pricing means future migration is non-breaking for historical bills. |
| `created_by`, `approved_by`, `cancelled_by` as direct user-id columns | **Kept, as `UUID` soft refs to User Management.** | These are actor-of-record fields, not joins. Display name resolution is on read. |
| `tax_breakup`, `gateway_response`, `query_details` as JSON | **Kept, as `JSONB`.** | Common pattern; index where queried (GIN on `tax_breakup->>'cgst'` if reporting needs it). |

### Charge-ingest contract

This is the API that clinical modules call to capture charges. It is the *single* integration surface between clinical modules and billing.

```
POST /v1/billing/charges
Authorization: Bearer <service-jwt>
X-Tenant-Id: <iq_tenant_id>
Idempotency-Key: <client-generated>

{
  "patient_id": "<uuid>",
  "visit_id": "<uuid>",
  "visit_type": "OPD" | "IPD" | "ER" | "DAYCARE",
  "source_module": "opd" | "ipd" | "lab" | "pharmacy" | "radiology" | ...,
  "source_ref": "<uuid of the source clinical row>",
  "item_code": "<service or package code>",
  "quantity": 1,
  "performed_by": "<doctor_id as user_id>",
  "performed_date": "2026-05-13T10:30:00Z",
  "department": "cardiology",
  "notes": "..."
}

201 Created
{
  "bill_item_id": "<uuid>",
  "bill_id": "<uuid>",
  "snapshotted_unit_price": "500.00",
  "snapshotted_tax_percentage": "18.00",
  "net_amount": "590.00"
}
```

Billing resolves `item_code` against `service_master` and any active `price_agreements`, snapshots the resulting price into `bill_items`, attaches the row to the current open `bill` for `(patient_id, visit_id)` (creating one if none exists), and returns the resulting row. Idempotency-Key prevents duplicate inserts on retry.

Phase 1 ingest is **synchronous HTTP** from clinical modules to the embedded billing handler (in-process). Phase 2+ may add an **async outbox path** when extraction happens, so a slow charge-ingest does not block clinical finalisation. The contract above is identical in either case; the clinical module simply enqueues to its outbox instead of awaiting the response.

## Consequences

### Positive

- **Phase 1 sprint-shippable.** Eight tables, one state machine, one happy path per bill type. One developer can ship a counter-billing demo in a sprint.
- **Reaches existing-production parity quickly.** The OPD counter flow that exists in the production HIMS is reproduced exactly, with the same workflow shape (capture → bill → pay → receipt).
- **Snapshot pricing isolates billing from catalog churn.** Future changes to `service_master` cannot retroactively change historical bills. Audit and re-print are trustworthy by construction.
- **Module-boundary clean.** Clinical modules emit charges via a published contract. Billing does not know what clinical events look like; it knows what a chargeable item is. New clinical modules slot in without billing changes.
- **Lead's ERD respected.** Table names, column intent, and the bill-replacement chain (`replaced_bill_id`, `parent_bill_id`) all come straight from his work. Departures are structural (multi-tenancy, no cross-module FKs, no audit table) not domain-substantive.
- **Embedded-then-extracted defers operational complexity.** Phase 1 deployment is one process, one binary, one log stream. Extraction is a low-risk Phase 2+ move because the code, schema, and contract are designed for it from day one.

### Negative and mitigations

- **`patients` table is in EMPI, not billing.** Invoice-rendering requires a call to EMPI (or a cache hit). Mitigation: TTL cache of `(patient_id → display_fields)` with event-bust on `patient.updated`. Adds ~5 ms p95 to invoice render in the cache-miss case; well under the 100 ms target.
- **Insurance flows wait until Phase 2.** Cashless and TPA-reimbursement deployments cannot run on Phase 1 alone. Mitigation: cash-and-card flow is enough for the sprint demo and the first wave of small-clinic tenants. Phase 2 timeline is the next sprint after Phase 1 lands.
- **Doctor commissions wait until Phase 4.** Hospitals running visiting-consultant arrangements need this earlier than Phase 4 nominally suggests. Mitigation: Phase 4 can start in parallel with Phase 2 if a tenant demands it; the schema is additive and the columns it touches (`bill_items.performed_by`, `bills.created_by`) already exist in Phase 1.
- **Snapshot pricing means a price-list correction does not retroactively fix bills already issued.** This is by design but operators must be trained: if a wrong price was billed, the correction is a bill amendment (replacement chain) plus a refund-or-additional-charge, not a catalog edit. Mitigation: documented in the dev guide and the operator UX.
- **Embedded coupling to OPD service means OPD downtime takes billing down with it in Phase 1.** Mitigation: this is acceptable because the only client in Phase 1 *is* OPD. Extraction triggers the moment a second client appears.
- **No `billing_audit_log` table in Phase 0/1.** Some operators expect a built-in financial audit trail. Mitigation: structured request logs (captured by HTTP middleware) + rich event payloads (`bill.finalized`, `payment.recorded` with full before/after) are the substrate. The centralized audit consumer projects from these per [ADR-0024](./0024-audit-deferred-to-pre-prod.md).

### Operational impact

- **One developer for Phase 1**, mounted into the existing OPD service team's sprint. No new service to operate.
- **No new infrastructure** beyond the OPD service's Postgres database.
- **Extraction in Phase 2+** is a one-sprint operation: new Fastify entrypoint, copy the deploy manifest, update the OPD service's `BILLING_API_BASE_URL` Configurator integration profile entry. No data migration.

## Validation criteria

- A Phase 1 counter operator can complete the full happy path in the demo tenant: register patient (frontdesk/EMPI), capture three OPD charges (consultation + two procedures), capture an advance, apply a discount with approval, raise the bill, accept cash payment, print a receipt.
- A re-print of yesterday's bill renders the same total even after today's `service_master` price update.
- A bill amendment (replacement chain) leaves the original bill untouched in `bills` and `bill_items`; the new bill references the old via `replaced_bill_id`.
- Charge-ingest is idempotent: replaying the same `Idempotency-Key` returns the existing `bill_item_id` without creating a duplicate row.
- All Phase 1 tables co-locate on the same Citus shard for a given tenant (verified by `SELECT shardid FROM pg_dist_shard_placement` queries in staging).

## References

- The lead's reference ERD: `hospital_billing_.erd.json` (23 tables, shared 2026-05-13). Table names and column intent preserved unless explicitly departed from above.
- [ADR-0002 — Multi-tenant fragmentable adoption](./0002-multi-tenant-fragmentable-adoption.md)
- [ADR-0006 — Four core platform modules](./0006-four-core-platform-modules.md) (billing is *not* fifth; Record Foundation is per [ADR-0028](./0028-record-foundation-fifth-core-module.md))
- [ADR-0008 — Module shape and boundaries](./0008-module-shape-and-boundaries.md)
- [ADR-0009 — Event-driven inter-module communication](./0009-event-driven-inter-module-communication.md)
- [ADR-0012 — Multi-tenancy isolation strategy](./0012-multi-tenancy-isolation-strategy.md)
- [ADR-0017 — In-process event bus, Phase 0](./0017-in-process-event-bus-phase-0.md)
- [ADR-0024 — Audit deferred to pre-prod](./0024-audit-deferred-to-pre-prod.md)
- [Build order — analysis/02-module-build-order.md](../analysis/02-module-build-order.md)
- [Module shape template — HLD 03](../hld/03-module-shape-template.md)
- [Billing HLD — HLD 06](../hld/06-billing.md)
- [Billing LLD — schema design](../lld/billing/01-schema-design.md)
- Industry convention for snapshot-pricing in financial line items: every accounting standard (Ind AS 18 / IFRS 15) treats the price agreed at the point of transfer-of-control as the recognised revenue, independent of subsequent catalog changes. Snapshotting on `bill_items` is the database expression of this convention.
