# Billing — Phased Implementation Guide

> Mirror of the GitHub issue body. Posted as a separate issue to track the implementation.

**Phase 0/1 dev simplifications apply.** See [dev-env-simplifications.md](../../dev-env-simplifications.md) for the `HIMS_CITUS_ENABLED`, `PERMISSIVE_MODE`, `STRICT_SPEC_VALIDATION` knobs and the [REQUIRED FOR DEMO] / [DEFER IF TIME-CONSTRAINED] / [POST-DEMO] tag legend. Steps below tagged accordingly; untagged = [REQUIRED FOR DEMO] by default.

Billing is a **horizontal supporting module** per [ADR-0025](../../adr/0025-billing-module-shape-and-phasing.md). Phase 1 reaches existing-production OPD counter-billing parity. Phase 1 ships as a library embedded in `services/opd-svc`; the same code extracts to `services/billing-svc` in Phase 2+ with no schema migration.

## What's already designed

- **HLD:** [06-billing.md](../../hld/06-billing.md).
- **LLD schema:** [01-schema-design.md](./01-schema-design.md) and [`schema-reference.json`](./schema-reference.json) (8 Phase 1 tables; 9 Phase 2-4 tables sketched).
- **Scenarios:** [02-scenarios.md](./02-scenarios.md) (10 sequence-driven walkthroughs covering Phase 1 happy path, advances, discounts, amendment, partial pay, cancellation, idempotent replay, Phase 2 insurance sketch, failure handling).
- **Dev-doubts:** [dev-doubts/01.md](./dev-doubts/01.md) (12 implementation choices with recommendations).
- **OpenAPI spec:** [`specs/openapi/billing.v1.yaml`](../../../../specs/openapi/billing.v1.yaml) (Phase 1 endpoints).
- **ERDs (per phase, cumulative):** [`billing.phase-1.erd.json`](./billing.phase-1.erd.json) (8 tables — Phase 1 / counter parity), [`billing.phase-2.erd.json`](./billing.phase-2.erd.json) (14 — adds insurance/corporate/packages), [`billing.phase-3.erd.json`](./billing.phase-3.erd.json) (18 — adds refunds/plans/IPD final), [`billing.phase-4.erd.json`](./billing.phase-4.erd.json) (21 — adds doctor commissions).
- **ADRs:** [0025](../../adr/0025-billing-module-shape-and-phasing.md) (this module's shape + phasing). Related: [0008](../../adr/0008-module-shape-and-boundaries.md), [0009](../../adr/0009-event-driven-inter-module-communication.md), [0012](../../adr/0012-multi-tenancy-isolation-strategy.md), [0024](../../adr/0024-audit-deferred-to-pre-prod.md).
- **Lead's reference ERD:** `hospital_billing_.erd.json`. Table names and column intent preserved; departures recorded in [ADR-0025 §deliberate-departures](../../adr/0025-billing-module-shape-and-phasing.md#deliberate-departures-from-the-leads-erd).

---

## Phase 1a — Module scaffold + schema (1 dev-week)

**Goal:** `modules/billing/` exists, mounts inside `services/opd-svc`, the 8 Phase 1 tables exist in the database.

- [ ] Scaffold `modules/billing/src/` per the [module shape template](../../hld/03-module-shape-template.md). Folders: `ports`, `domain`, `use-cases`, `data-access`, `http-handlers`, `rest-handlers`, `events/publishers`, `schema`.
- [ ] Add the billing Fastify plugin (`router.ts`) and the public surface (`index.ts`).
- [ ] In `services/opd-svc/src/main.ts`, register the billing plugin under `/billing` prefix.
- [ ] Generate Drizzle migrations for the **4 Phase 1 tables** in [`schema-reference.json`](./schema-reference.json): `service_master`, `bills`, `bill_items`, `payments`. All distributed by `iq_tenant_id`; co-location with `bills` for `bill_items` and `payments` (see [§14 Citus distribution](./01-schema-design.md#14-citus-distribution-summary)). The Citus calls run only when `HIMS_CITUS_ENABLED=true` ([dev-env-simplifications](../../dev-env-simplifications.md)). Phase 2 tables (`price_agreements`, `patient_advances`, `advance_utilizations`, `discount_approvals`, `insurance_*`, `corporate_clients`, `service_packages`, `package_items`) ship in the Phase 2 issue.
- [ ] All CHECK constraints from [`schema-reference.json`](./schema-reference.json) included in the migration.
- [ ] Indexes per [§4–§8 of the LLD](./01-schema-design.md).
- [ ] Wire identity adapter (`@hims/ts-sdk-identity`), tenant context (`@hims/ts-sdk-tenant`), event publisher (`@hims/ts-sdk-events`), DB helpers (`@hims/ts-sdk-db`).
- [ ] Cerbos policies for billing admin actions (service catalog write, discount approval, bill cancellation, payment void). **[DEFER IF TIME-CONSTRAINED]** — `PERMISSIVE_MODE=true` locally; staging requires real policies before cutover.
- [ ] Smoke test: register a tenant, seed one service in `service_master`, run `SELECT count(*)` per Citus shard to confirm distribution.

## Phase 1b — Domain layer + Money type (3-5 dev-days)

**Goal:** Domain types and the `Money` value object are in place; bill / bill-item / payment state machines are encoded as TypeScript ADTs.

- [ ] Implement `domain/money.ts` per [dev-doubts/01.md §money-type](./dev-doubts/01.md#money-type--numeric184-vs-paise-as-bigint). `Money` wraps `string`; provides `add`, `subtract`, `multiply(quantity: number)`, `applyTax(rate: Money | number)`, `round(decimals: 2 | 4)`. Avoid JS `number` for money internally.
- [ ] Implement `domain/bill-status.ts` with the state machine in [§4 LLD](./01-schema-design.md#4-bills--bills): valid transitions + transition validators.
- [ ] Implement `domain/payment-method.ts` with the payment-method enum and method-specific required fields (card_last4 for CARD; upi_id for UPI; cheque_number for CHEQUE; etc.).
- [ ] Implement `domain/bill.ts`, `domain/bill-item.ts`, `domain/payment.ts`, `domain/patient-advance.ts`, `domain/discount-approval.ts` as constructor functions returning sealed value objects with validated invariants.
- [ ] Vitest unit tests for the state machines (every valid transition + every invalid one).

## Phase 1c — Repositories + use-cases (5-7 dev-days)

**Goal:** All Phase 1 endpoints in the OpenAPI spec are wired end-to-end with happy paths working.

- [ ] Implement `data-access/drizzle-bill-repository.ts`, `drizzle-bill-item-repository.ts`, `drizzle-payment-repository.ts`, `drizzle-advance-repository.ts`, `drizzle-service-master-repository.ts`, `drizzle-price-agreement-repository.ts`, `drizzle-discount-approval-repository.ts`. Repository methods receive a `tx` parameter for transaction-scoped writes.
- [ ] Implement `use-cases/capture-charge.ts` per [scenarios §1-2](./02-scenarios.md#scenario-1--new-patient-opd-registration-the-production-parity-flow):
  - Resolve `item_code` via `service_master` (current state read — the snapshot is on the bill_item).
  - **Phase 1 price resolution is single-table:** read `service_master.base_price` and `.tax_percentage` directly. No agreements, no per-tenant default rows, no overrides. Per-doctor consultation pricing is encoded as separate `service_master` rows (lazy explosion per [LLD §2.1](./01-schema-design.md#21-per-doctor-pricing-in-phase-1--lazy-catalog-explosion)).
  - Idempotency: if `idempotency_key` exists for the tenant, return the existing bill_item without inserting.
  - Find or create the open DRAFT bill for `(patient_id, visit_id)`.
  - INSERT `bill_items` with snapshotted `item_code`, `description`, `unit_price`, `tax_percentage`, `tax_category`, `is_insurance_covered`.
  - UPDATE `bills` totals (subtotal, tax_amount, net_amount, outstanding_amount).
  - Publish `bill.item-added` (and `bill.created` if new).
- [ ] Implement `use-cases/finalize-bill.ts`: DRAFT → FINALIZED, generate bill_number, lock totals, publish `bill.finalized`.
- [ ] Implement `use-cases/cancel-bill.ts`: state validation; mark cancelled; publish `bill.cancelled`. (No advance-utilisation release logic in Phase 1 — advances are Phase 2.)
- [ ] Implement `use-cases/amend-bill.ts` per [scenario 5](./02-scenarios.md#scenario-5--bill-amendment-replacement-chain): copy bill + items to new DRAFT row; mark original REPLACED; publish `bill.amended`.
- [ ] Implement `use-cases/record-payment.ts` per [§6 LLD](./01-schema-design.md#6-payments--payments) and [scenario 1](./02-scenarios.md#scenario-1--new-patient-opd-registration-the-production-parity-flow): `SELECT bills FOR UPDATE`; INSERT payment; UPDATE bill totals; transition bill status (FINALIZED → PAID in Phase 1 — `PARTIALLY_PAID` state exists but is not exercised in the existing-prod flow). Publish `payment.received`.
- [ ] Implement `use-cases/apply-bill-level-discount.ts`: PATCH bill with `discount_percentage` + `discount_reason`. Bill-level discount only (sets `bills.discount_amount`, `bills.discount_percentage`); no approval workflow, no `discount_approvals` row. Existing-prod parity.

**NOT in Phase 1 (move to Phase 2 issue):** `record-advance.ts`, `utilize-advance.ts`, `request-discount.ts`, `approve-discount.ts`, agreement-based price resolution. These ship with the Phase 2 tables.
- [ ] All use-cases follow the function-per-file convention with deps injected as params (no class with multiple methods).
- [ ] Bill-item immutability enforced in `BillItemRepo.update()` per [dev-doubts §bill-item-immutability](./dev-doubts/01.md#bill-item-immutability-enforcement).
- [ ] Vitest tests for the happy path of each use-case + the immutability invariant + idempotency.

## Phase 1d — HTTP handlers + OpenAPI conformance (3-5 dev-days)

**Goal:** All Phase 1 paths in `billing.v1.yaml` respond correctly; request validation matches the spec.

- [ ] Generate request/response types from the OpenAPI spec via `openapi-typescript`.
- [ ] Implement `http-handlers/` and `rest-handlers/` per the spec. Use Fastify schema validation for request bodies.
- [ ] Idempotency-Key handling on `POST /v1/billing/charges`, `POST /v1/billing/payments`, `POST /v1/billing/advances` per [dev-doubts §idempotency-key-ttl](./dev-doubts/01.md#idempotency-key-ttl-and-storage). **[REQUIRED FOR DEMO]** on `/charges` (clinical retry path); **[DEFER IF TIME-CONSTRAINED]** on `/payments` and `/advances` (lower retry exposure in Phase 1).
- [ ] Standard error shape (matches integration-hub.v1.yaml's pattern); 400, 401, 403, 404, 409 covered.
- [ ] Cerbos PEP wired in front of every mutating handler (resource type maps to bill, payment, advance, discount; actions are `read`, `create`, `update`, `cancel`, `approve`, `void`).
- [ ] Acceptance: an end-to-end happy-path test runs through all 10 scenarios in [02-scenarios.md](./02-scenarios.md) using HTTP calls.

## Phase 1e — Event publishers + projection consumers (2-3 dev-days)

**Goal:** Domain events fire on every mutation; the OPD service receives `bill.finalized` for its own projection.

- [ ] Implement `events/publishers/` for all Phase 1 events listed in [HLD 06 §3](../../hld/06-billing.md#events-published).
- [ ] Each event carries a rich payload (per [ADR-0009](../../adr/0009-event-driven-inter-module-communication.md) and [CLAUDE.md](../../../../CLAUDE.md)): full bill row + items + bill summary for `bill.finalized`; payment row + bill summary for `payment.received`; etc.
- [ ] Phase 1 uses the in-process event bus ([ADR-0017](../../adr/0017-in-process-event-bus-phase-0.md)).
- [ ] Wire OPD's projection consumer of `bill.finalized` (visit-level billing summary) if OPD needs it; otherwise defer.
- [ ] Acceptance: every mutating use-case emits the documented event with the documented payload (verified by a registered test consumer).

## Phase 1f — Receipt rendering (3-5 dev-days)

**Goal:** Operator can print a receipt / invoice that matches the production HIMS look-and-feel.

- [ ] Stand up `services/pdf-svc/` if not already present (likely a thin Puppeteer-based renderer with a tenant-CSS-aware HTML template).
- [ ] Receipt template includes: tenant brand header (configured in Configurator), patient name/ABHA/age/sex (fetched from EMPI), bill number, bill date, itemised lines, tax breakup (CGST/SGST/IGST), payment method(s), receipt number, signature line.
- [ ] Phase 1 fallback: client-side `window.print()` of a styled HTML page if `services/pdf-svc` is not yet up. **[REQUIRED FOR DEMO]** (this fallback, or the pdf service)
- [ ] Stand up `services/pdf-svc/` proper. **[DEFER IF TIME-CONSTRAINED]** — client-side print is acceptable for the demo.
- [ ] Acceptance: `GET /v1/billing/bills/{id}/receipt.pdf` returns a PDF matching the expected layout in the demo tenant.

## Phase 1g — Demo seed + acceptance (2 dev-days)

- [ ] Seed the demo tenant's `service_master` with **~15-20 rows** matching existing-prod parity scope:
  - 1 row: `REG_FEE` (registration fee, ₹100).
  - 4-5 rows: `CONS_<TYPE>_DR_<NAME>` (one per (consultation type, doctor) combination — lazy explosion per [LLD §2.1](./01-schema-design.md#21-per-doctor-pricing-in-phase-1--lazy-catalog-explosion)).
  - 5-10 rows: common procedures (dressing, injection, nebulization, suturing, simple lab orders) that frontdesk might add to the bill before Create-Visit.
- [ ] Seed one `TENANT_DEFAULT` price agreement (uses rack rates).
- [ ] Acceptance scenario: register a patient (frontdesk/EMPI), capture three OPD charges (consultation + two procedures), capture an advance, apply a discount with approval, raise the bill, accept cash payment, print a receipt. End-to-end in < 2 minutes operator time.

---

## Phase 2 — Advances, discount-approvals, price-agreements, insurance, corporate, packages (separate issue; ~5-6 weeks)

Schema and column-level detail in [§§3, 7, 8 LLD](./01-schema-design.md) (price_agreements, advances, discount_approvals — column-level already designed, just not in Phase 1 scope) and [§9 LLD](./01-schema-design.md#9-phase-2--insurance-corporate-packages-advances-discount-approvals-price-agreements-sketch) (insurance, corporate, packages — sketches).

**Tables added (10):**

- [ ] `price_agreements` — adds the agreement abstraction; Phase 1's lazy-explosion service rows can stay or be reorganised (catalog-cleanup migration, snapshot pricing protects historical bills).
- [ ] `patient_advances`, `advance_utilizations` — IPD admission deposits, OPD pre-payments.
- [ ] `discount_approvals` — threshold-based approval workflow (config in Configurator).
- [ ] `insurance_providers`, `patient_insurance_policies`, `insurance_claims` — TPA / cashless / reimbursement flow.
- [ ] `corporate_clients` — company-billed accounts with credit-day terms.
- [ ] `service_packages`, `package_items` — marketed bundles (health checkups, surgical packages).

**Use-cases added:**

- [ ] `record-advance.ts`, `utilize-advance.ts` (with `SELECT FOR UPDATE` + balance CHECK).
- [ ] `request-discount.ts`, `approve-discount.ts` (with Configurator-driven threshold lookup).
- [ ] Pre-authorisation flow (calls Integration Hub for TPA gateway transport).
- [ ] Claim submission flow (FSM lives in Integration Hub per [HLD 05 §4](../../hld/05-integration-and-interop.md); billing holds the data of record).
- [ ] Settlement consumer projects onto `insurance_claims` and `bills.insurance_*_amount` columns.
- [ ] Package-aware charge-ingest: a single charge of a package expands into one `bill_items` row per `package_items` entry (item_type = PACKAGE_LINE).
- [ ] Corporate billing: bill_category = CORPORATE, due_date set, AR aging dashboard.
- [ ] Agreement-based price resolution: extend `capture-charge.ts` with the 7-step resolution order (patient policy → corporate → insurer → doctor override → department override → tenant default → rack rate) per [LLD §3](./01-schema-design.md#3-price-agreements--price_agreements).

## Phase 3 — Refunds, payment plans, IPD final bills (separate issue; ~3 weeks)

Per [§10 LLD](./01-schema-design.md#10-phase-3--refunds-payment-plans-ipd-final-bills-sketch):

- [ ] Add 4 tables: `refunds`, `payment_plans`, `installments`, `ipd_discharge_summaries`.
- [ ] Refund flow with approval workflow.
- [ ] Payment plan creation; daily installment-due batch; reminder loop.
- [ ] IPD discharge summary as a computed roll-up + stored row.
- [ ] Migrate the Phase 1 advance-as-refund-workaround to true refunds.

## Phase 4 — Doctor commissions (separate issue; ~2 weeks; independent of Phase 2/3)

Per [§11 LLD](./01-schema-design.md#11-phase-4--doctor-commissions-sketch):

- [ ] Add 3 tables: `doctor_commission_rules`, `doctor_commissions`, `doctor_commission_payouts`.
- [ ] Accrual consumer on `bill.item-added` event.
- [ ] Periodic payout-cycle batch.
- [ ] Approval and payment workflow.

---

## Extraction (Phase 2+ or earlier, trigger-driven)

Triggers ([ADR-0025 §packaging](../../adr/0025-billing-module-shape-and-phasing.md#packaging--phase-1-vs-extraction)):
- A second clinical module (typically IPD) needs to emit charges.
- Operational pressure (failure isolation, scaling) justifies the split.

When triggered (1 dev-week):

- [ ] Scaffold `services/billing-svc/` with the standard Fastify bootstrap and register the existing `modules/billing` plugin.
- [ ] Update each clinical module's `BILLING_API_BASE_URL` in their Configurator integration profile.
- [ ] Migrate event bus subscriptions from the in-process bus to the durable bus per [ADR-0009](../../adr/0009-event-driven-inter-module-communication.md).
- [ ] No data migration. Same `billing.*` schema. Same database cluster.
- [ ] Acceptance: clinical modules can emit charges to the new service; bills/payments/advances all functional; receipts render.

---

## Non-goals for this issue

- No `billing_audit_log` table (per [ADR-0024](../../adr/0024-audit-deferred-to-pre-prod.md)). Audit substrate is structured request logs + rich event payloads + soft-delete-by-status.
- No `patients` table in billing (per [CLAUDE.md](../../../../CLAUDE.md) and [ADR-0007](../../adr/0007-empi-dedicated-platform-service.md)). EMPI is the source of truth; billing references `patient_id`.
- No general ledger, no vendor payments, no payroll. Out of HIMS billing scope; ERP integration via exports.
- No real-time price resolution at view time. Snapshot pricing on `bill_items` is binding.

## Open dev-doubts the developer decides

See [dev-doubts/01.md](./dev-doubts/01.md). Each has a recommendation; the developer can deviate with a recorded rationale in the PR description.

- Bill / payment / advance / receipt number format
- Money type (NUMERIC vs paise-bigint)
- Bill-item immutability enforcement (application vs trigger)
- Advance utilisation concurrency strategy
- Tax-rate snapshot vs lookup (binding: snapshot)
- Soft-delete vs status on cancellation (binding: status)
- Receipt PDF generation strategy
- Idempotency-Key TTL and storage
- Lab charge timing — order vs result
- Pharmacy charge timing — order vs dispense
- Configurator-controlled vs hard-coded discount thresholds
- Transactionality boundaries (what runs in one DB transaction)
