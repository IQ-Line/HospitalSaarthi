# Billing — Module Orientation

**For the developer who just got assigned to billing.** 10-minute read; points you at the 4-5 files you'll actually touch in a sprint.

---

## What this module does, in one paragraph

Billing owns patient-facing revenue cycle: capture charges from clinical modules, assemble bills, accept payments (cash / card / UPI / cheque), generate receipts. Phase 1 ships **four tables** (`service_master`, `bills`, `bill_items`, `payments`) — the minimum set that reproduces the existing production HIMS OPD counter flow. Advances, discount-approval workflow, price-agreement overrides, insurance, corporate billing, and packages all land in Phase 2; refunds and payment plans in Phase 3; doctor commissions in Phase 4.

Lives in `modules/billing/`, mounted inside `services/opd-svc/` for Phase 1 (extracts to `services/billing-svc/` when a second clinical module needs to emit charges).

---

## Where to start

Read in this order — each one is 10 minutes max:

1. **[ADR-0025](../../adr/0025-billing-module-shape-and-phasing.md)** — why billing is shaped this way (snapshot pricing, embedded-then-extracted, phased rollout). The load-bearing decision; if you only read one document, read this.
2. **[HLD 06 — Billing](../../hld/06-billing.md)** — purpose, owns, exposes, depends-on, failure modes. The shape from outside.
3. **[01-schema-design.md](./01-schema-design.md)** — the 8 Phase 1 tables with column-level detail.
4. **[02-scenarios.md](./02-scenarios.md)** — 10 sequence diagrams of the flows you'll build.
5. **[dev-guide.md](./dev-guide.md)** — your phased checklist (Phase 1a through 1g).

Then the cheat-sheet: **[docs/architecture/dev-cheatsheet.md](../../dev-cheatsheet.md)**. Pin it.

---

## The 4-5 files you'll touch most

When you're heads-down on a billing task, you'll mostly be editing these:

| Path (after scaffold) | What | When you edit |
|---|---|---|
| `modules/billing/src/use-cases/<verb>-<noun>.ts` | One function per file: `capture-charge.ts`, `finalize-bill.ts`, `record-payment.ts`, etc. Function signature: `(deps, input) => Promise<Output>`. | Every new business operation. |
| `modules/billing/src/domain/<entity>.ts` | Bill, BillItem, Payment, Advance value objects + state-machine helpers. | Adding state, refining invariants. |
| `modules/billing/src/data-access/drizzle-<entity>-repository.ts` | Repository class implementing the port. Transaction-scoped methods. | Adding queries; *don't* leak ORM types upward. |
| `modules/billing/src/schema/<table>.ts` | Drizzle table definition + migration. | Adding a table or column. |
| `modules/billing/src/http-handlers/` and `rest-handlers/` | Fastify route handlers. Validate request → call use-case → return response. Stateless. | New endpoint. |
| `specs/openapi/billing.v1.yaml` | Source of truth for the API contract. | Change the request/response shape (always before changing handlers). |

What you'll touch *less*:

- `modules/billing/src/events/publishers/` — set-and-forget after Phase 1c lands.
- `modules/billing/src/ports.ts` — interfaces; rarely changes once stable.
- `modules/billing/src/router.ts` — auto-discovers handlers; only edit to add a new tag.

---

## The mental model

> A charge captured by a clinical module is **frozen** into a bill_item with snapshotted pricing. Bills move through a state machine: `DRAFT → FINALIZED → PARTIALLY_PAID → PAID → CLOSED`, with `CANCELLED` and `REPLACED` as terminal sidetracks. Once a bill leaves DRAFT, its items are immutable. Corrections happen via **amendment** (a replacement bill in DRAFT linking back via `replaced_bill_id`), never in-place edit.

If you remember nothing else: **DRAFT is mutable; everything past DRAFT is immutable from amendment**, and **the bill_item row carries its own snapshotted price/tax/description, not a join to the catalog**.

---

## What to ignore in Phase 1

These are real concerns but they are Phase 2 or later. Don't accidentally implement them.

**Phase 2 (was in earlier drafts of Phase 1; demoted to match existing-prod parity):**
- `price_agreements` — Phase 1 handles per-doctor consultation pricing via lazy-explosion in `service_master` (one row per (consultation, doctor)). The agreement abstraction lands with insurance + corporate.
- `patient_advances` + `advance_utilizations` — existing OPD counter does not take advances. First real use is IPD admission deposit (Phase 2+).
- `discount_approvals` — existing frontdesk lets operators enter any % freely. Approval workflow is Phase 2 product.

**Phase 2 (always was):**
- Insurance providers, policies, claims.
- Corporate clients and credit-day billing.
- Service packages and package_items.

**Phase 3:**
- Refunds, payment plans, installments, IPD final bills.

**Phase 4:**
- Doctor commission rules, accruals, payouts.

**Never (per ADRs):**
- A `billing_audit_log` table — [ADR-0024](../../adr/0024-audit-deferred-to-pre-prod.md). Centralized consumer.
- A `patients` table in billing — soft `patient_id` ref to EMPI per [ADR-0007](../../adr/0007-empi-dedicated-platform-service.md).

---

## Common pitfalls

| Trap | What to do instead |
|---|---|
| "I'll just look up `service_master.tax_percentage` when rendering the bill." | Snapshot it onto `bill_items.tax_percentage` at charge capture. See [cheat-sheet rule 6](../../dev-cheatsheet.md#6-snapshot-prices-and-other-immutable-fields-on-the-row). |
| "Let me add a FK from `bill_items.patient_id` to `empi.patients.id`." | Soft ref only. See [cheat-sheet rule 4](../../dev-cheatsheet.md#4-no-cross-schema-foreign-keys). |
| "I'll forget the `Idempotency-Key` on charge-ingest." | Required for `/charges`. Without it, OPD retries create duplicate bill_items. |
| "OPD failed mid-finalisation — let me edit the bill_item." | If the bill is past DRAFT, amend it (replacement chain). Never edit immutable rows. |
| "I'll use `is_deleted = true` to cancel a bill." | Status enum. `CANCELLED` is a state, not a deletion. See [cheat-sheet rule 11](../../dev-cheatsheet.md#11-soft-delete-by-status-not-by-is_deleted). |

---

## When you hit a decision the LLD doesn't cover

Look in **[dev-doubts/01.md](./dev-doubts/01.md)** — 12 implementation choices with recommendations. If your decision isn't there, write it up as a new entry, recommend an approach, and bring it to architecture review.
