# Billing — Scenarios

**Module:** Billing
**Related:** [01-schema-design.md](./01-schema-design.md) | [HLD 06 — Billing](../../hld/06-billing.md) | [ADR-0025](../../adr/0025-billing-module-shape-and-phasing.md)

This document walks through the Phase 1 happy-path and corner-case flows the schema supports — chosen to match the existing production HIMS OPD counter flow as closely as possible. Phase 2 scenarios (insurance, advances, discount-approval workflow, partial payments) are sketched at the bottom for forward reference.

Sequence diagrams use Mermaid. Actors:

- **Operator** — frontdesk / counter / cashier; uses the web BFF.
- **OPD module** — visit creation, free-follow-up flag, prior-visit check.
- **Billing** — `modules/billing` library (embedded in `services/opd-svc` in Phase 1).
- **EMPI** — patient identity service.
- **Bus** — in-process event bus ([ADR-0017](../../adr/0017-in-process-event-bus-phase-0.md)) in Phase 1.

The four Phase 1 tables exercised: `service_master`, `bills`, `bill_items`, `payments`.

---

## Scenario 1 — New patient OPD registration (the production-parity flow)

**This is the canonical Phase 1 flow.** A patient walks up to the frontdesk for the first time. The operator finds-or-creates the patient (EMPI), captures the registration fee + the consulting doctor's consultation fee, applies a discount if any, takes a single payment, and clicks **Create Visit**. The bill goes DRAFT → FINALIZED → PAID inside that single click, exactly as in the existing production HIMS.

```mermaid
sequenceDiagram
    actor Operator as Frontdesk Operator
    participant BFF as services/web (BFF)
    participant OPD as OPD module<br/>(in services/opd-svc)
    participant Billing as Billing module<br/>(in services/opd-svc)
    participant EMPI as EMPI service
    participant DB as Postgres
    participant Bus as Event bus

    Note over Operator: Patient arrives. Operator types<br/>name / mobile / ABHA.
    Operator->>BFF: GET /api/v1/patients/search?q=...
    BFF->>EMPI: GET /v1/patients?q=...
    EMPI-->>BFF: [] (no match) — new patient
    Operator->>BFF: Click "Register new patient" + fill form
    BFF->>EMPI: POST /v1/patients (name, dob, sex, mobile, ABHA?)
    EMPI-->>BFF: 201 {patient_id}
    EMPI-->>Bus: patient.created

    Note over Operator,Billing: Patient is new ⇒ frontdesk adds REG_FEE line.<br/>Operator picks doctor from dropdown.

    Operator->>BFF: Select "Consulting Doctor: Dr Smith"
    BFF->>Billing: POST /v1/billing/charges<br/>{patient_id, source_module:"opd", item_code:"REG_FEE",<br/> quantity:1, performed_by:operator_id}<br/>Idempotency-Key: <ui-session>-reg
    Billing->>DB: Resolve REG_FEE from service_master<br/>(base_price=100, tax=0)
    Billing->>DB: No open bill → INSERT bills (DRAFT, totals=0)
    Billing->>DB: INSERT bill_items (REG_FEE, snapshot price/tax)
    Billing->>DB: UPDATE bills (subtotal=100, net=100)
    Billing-->>BFF: 201 {bill_id, bill_item_id, net_amount:100}
    Bus-->>Billing: bill.created, bill.item-added

    BFF->>Billing: POST /v1/billing/charges<br/>{patient_id, source_module:"opd",<br/> item_code:"CONS_GENERAL_DR_SMITH",<br/> quantity:1, performed_by:dr_smith_id}<br/>Idempotency-Key: <ui-session>-cons
    Billing->>DB: Resolve CONS_GENERAL_DR_SMITH (base_price=500)
    Billing->>DB: SELECT bills ... DRAFT for (patient, no visit yet) → existing bill_id
    Billing->>DB: INSERT bill_items (consultation, snapshot)
    Billing->>DB: UPDATE bills (subtotal=600, net=600)
    Billing-->>BFF: 201 {bill_item_id, net_amount:600}

    Note over Operator: Operator enters discount 10%
    Operator->>BFF: Enter discount 10%
    BFF->>Billing: PATCH /v1/billing/bills/{bill_id}<br/>{discount_percentage:10, discount_reason:"Senior citizen"}
    Billing->>DB: UPDATE bills SET discount_amount=60,<br/>discount_percentage=10, discount_reason="Senior citizen",<br/>net_amount=540
    Billing-->>BFF: 200 {net_amount:540}

    Note over Operator: Operator enters payment_method = CASH<br/>and amount_paid = 540. Create Visit button enables.
    Operator->>BFF: Click "Create Visit"
    BFF->>Billing: POST /v1/billing/bills/{bill_id}/finalize
    Billing->>DB: SELECT bills FOR UPDATE
    Billing->>DB: UPDATE bills SET status='FINALIZED',<br/>bill_number generated, approved_by=operator_id
    Billing-->>BFF: 200 {status:'FINALIZED', bill_number}
    Bus-->>Billing: bill.finalized

    BFF->>Billing: POST /v1/billing/payments<br/>{bill_id, amount:540, payment_method:'CASH', received_by:operator_id}
    Billing->>DB: SELECT bills FOR UPDATE
    Billing->>DB: INSERT payments (CASH, 540, SUCCESS, receipt_number gen)
    Billing->>DB: UPDATE bills SET paid_amount=540,<br/>outstanding_amount=0, status='PAID'
    Billing-->>BFF: 201 {payment_id, receipt_number, status:'PAID'}
    Bus-->>Billing: payment.received

    BFF->>OPD: POST /v1/opd/visits (patient_id, doctor_id, bill_id)
    OPD->>DB: INSERT opd.visits (in OPD schema)
    OPD-->>BFF: 201 {visit_id}
    OPD-->>Bus: opd.visit.created

    BFF->>Billing: GET /v1/billing/bills/{bill_id}/receipt.pdf
    Billing->>EMPI: GET /v1/patients/{patient_id}<br/>(name/age/sex for receipt header)
    EMPI-->>Billing: patient display fields
    Billing-->>BFF: PDF receipt
    BFF-->>Operator: Print preview opens
```

**What the schema enforces:**

- Bill cannot accept a payment in `DRAFT` status (`CHECK (status != 'DRAFT' OR paid_amount = 0)`). The frontdesk UI's "Create Visit" disable-until-amount-matches is a UI guard; the DB constraint is the backstop.
- `bills.outstanding_amount = net_amount - paid_amount` invariant re-asserted on every payment.
- Idempotency-Key on charge POSTs prevents duplicate line items on double-click or network retry.
- The snapshotted `bill_items.unit_price` and `tax_percentage` are immutable; tomorrow's catalog price update does not retroactively change today's receipt.

**Mapping to existing production:** every step above mirrors what the operator does in the production HIMS today, with the same data captured: registration fee, doctor-specific consultation, discount %, payment mode + amount = total, Create Visit click. No new concepts introduced.

---

## Scenario 2 — Return-visit registration (no registration fee)

Same as Scenario 1 except the patient has visited before. The frontdesk UI checks `prior_visit_count > 0` (via EMPI or via OPD's prior-visit count) and **suppresses the REG_FEE line**.

```mermaid
sequenceDiagram
    actor Operator
    participant BFF
    participant OPD
    participant Billing
    participant EMPI

    Operator->>BFF: Search patient by mobile/ABHA
    BFF->>EMPI: GET /v1/patients?q=9876543210
    EMPI-->>BFF: [{patient_id, prior_visit_count: 3, ...}]
    Note over BFF: prior_visit_count > 0 ⇒ skip REG_FEE line.

    Operator->>BFF: Select doctor + discount + payment
    BFF->>Billing: POST /v1/billing/charges (CONS_GENERAL_DR_SMITH)
    Note over BFF,Billing: Only one charge — consultation only.
    BFF->>Billing: PATCH /v1/billing/bills/{bill_id} (discount)
    BFF->>Billing: POST /v1/billing/bills/{bill_id}/finalize
    BFF->>Billing: POST /v1/billing/payments
    BFF->>OPD: POST /v1/opd/visits
```

**Key behaviour:** the absence of the REG_FEE charge is the absence — no special "is_returning" column on `bill_items`. Schema is unchanged.

**Where does `prior_visit_count` come from?** Phase 1 implementation: EMPI exposes it as a derived field on the patient resource (cheap projection from OPD's visit table via a `opd.visit.created` consumer). Phase 1.5 alternative: OPD's `GET /v1/opd/patients/{id}/visit-count` endpoint, called by the frontdesk UI directly.

---

## Scenario 3 — Free-follow-up visit (no consultation fee)

The patient's prior consultation marked this follow-up as free (within X days). The frontdesk UI shows a "Free follow-up applies" banner and suppresses the consultation line.

```mermaid
sequenceDiagram
    actor Operator
    participant BFF
    participant OPD
    participant Billing
    participant EMPI

    Operator->>BFF: Search + select returning patient
    BFF->>EMPI: GET /v1/patients?q=...
    EMPI-->>BFF: {patient_id, prior_visit_count: 5}
    BFF->>OPD: GET /v1/opd/patients/{id}/free-follow-up-eligibility
    OPD-->>BFF: {eligible: true, prior_visit_id: vX, days_left: 3}
    Note over BFF: Skip REG_FEE (returning) AND skip CONS_* (free follow-up).

    Operator->>BFF: Add any procedures? None.
    Note over Operator,BFF: Bill total = 0 ⇒ Create Visit without payment.

    Operator->>BFF: Click Create Visit
    BFF->>Billing: (skipped — no bill needed for zero-total)<br/>OR POST /v1/billing/bills + finalize with net=0
    BFF->>OPD: POST /v1/opd/visits (free_follow_up=true, parent_visit_id=vX)
    OPD-->>BFF: 201 {visit_id}
```

**Phase 1 decision (deferred to dev):** for zero-total visits, do we still create a $0 bill row for audit symmetry, or skip the bill entirely? Recommendation: create a `bill_type='STANDALONE'` bill with `net_amount=0` and `status='PAID'` directly, with no `payments` row. This keeps "every visit has a bill" invariant and makes reporting consistent. Documented in [dev-doubts](./dev-doubts/01.md).

---

## Scenario 4 — Multi-line OPD visit (consultation + minor procedure)

The visit produces more than one chargeable line — the doctor performs a wound dressing or administers an injection during the consultation. Frontdesk captures all charges before Create Visit.

```mermaid
sequenceDiagram
    actor Operator
    participant BFF
    participant Billing

    Operator->>BFF: Select doctor (Dr Smith) + add procedure (Wound Dressing)
    BFF->>Billing: POST /charges (REG_FEE)  [if new patient]
    BFF->>Billing: POST /charges (CONS_GENERAL_DR_SMITH)
    BFF->>Billing: POST /charges (PROC_DRESSING, qty=1)
    Note over BFF,Billing: All three items roll up onto same bill (same patient,<br/>no visit_id yet but same UI session)
    BFF->>Billing: PATCH bill (discount if any)
    BFF->>Billing: POST /finalize
    BFF->>Billing: POST /payments
    BFF->>OPD: POST /v1/opd/visits
```

**Key behaviour:** all three charges arrive at billing **before** finalize. The bill accumulates line items in DRAFT state. Frontdesk's "Create Visit" disable-until-paid-matches-total guards the operator. No advances, no approval workflow, no partial payment — exactly the existing-production model.

---

## Scenario 5 — Bill amendment (replacement chain)

A finalised + paid bill is discovered to have a wrong procedure code (the actual procedure was cheaper). The bill is amended.

```mermaid
sequenceDiagram
    actor Operator
    participant Billing
    participant DB
    participant Bus

    Operator->>Billing: POST /v1/billing/bills/{bill_id}/amend<br/>{reason:'wrong procedure code on item X'}
    Billing->>DB: SELECT bills FOR UPDATE (original)
    Note over Billing: Validate status IN ('FINALIZED','PARTIALLY_PAID','PAID')
    Billing->>DB: INSERT bills (NEW, status='DRAFT',<br/>replaced_bill_id=original.id)
    Billing->>DB: INSERT bill_items (copy of original<br/>except corrected line)
    Billing->>DB: UPDATE original SET status='REPLACED'
    Billing-->>Operator: 201 {new_bill_id, status:'DRAFT'}
    Bus-->>Billing: bill.amended

    Operator->>Billing: PATCH /v1/billing/bills/{new}/items/{item}<br/>(corrected price/quantity)
    Operator->>Billing: POST /v1/billing/bills/{new}/finalize
    Operator->>Billing: POST /v1/billing/payments OR record refund (Phase 3)
    Note over Operator,Billing: Phase 1: if original was overpaid, capture the<br/>excess as a "credit note" outside the system or settle<br/>at next visit. Refunds proper land in Phase 3.
```

**Key behaviour:**

- Original bill is preserved with `status='REPLACED'` — never DELETEd.
- The new bill carries `replaced_bill_id` pointing back. Audit trail = the chain.
- Phase 1 has no refunds table (Phase 3); over/under-collection from an amendment is settled at the next visit or recorded as a manual note. This is also what existing production does — amendments at the counter are rare and handled informally.

---

## Scenario 6 — Bill cancellation (post-finalize)

Patient leaves without paying after the bill is raised, or the visit is voided. Cancel the bill.

```mermaid
sequenceDiagram
    actor Operator
    participant Billing
    participant DB

    Operator->>Billing: POST /v1/billing/bills/{bill_id}/cancel<br/>{reason:'patient absconded'}
    Billing->>DB: SELECT bills FOR UPDATE
    Note over Billing: Validate status IN ('DRAFT','FINALIZED','PARTIALLY_PAID')
    Billing->>DB: UPDATE bills SET status='CANCELLED',<br/>cancellation_reason=..., cancelled_by=operator_id,<br/>cancelled_at=now()
    Billing-->>Operator: 200 {status:'CANCELLED'}
```

Phase 1 caveat: any payments already on the bill remain as `payments` rows. If the patient had partially paid before absconding (rare in this flow because amount-paid-must-match-total — but possible if multiple payments were taken across visits), those payment rows stay; refund proper is Phase 3.

---

## Scenario 7 — Idempotent charge-ingest replay

The frontdesk UI double-submits the same charge (operator double-clicks "Add Consultation", or a network blip causes a retry).

```mermaid
sequenceDiagram
    participant UI as Frontdesk UI
    participant Billing
    participant DB

    UI->>Billing: POST /charges<br/>Idempotency-Key: <ui-session>-cons
    Billing->>DB: INSERT bill_items<br/>idempotency_key=<ui-session>-cons
    Billing-->>UI: 201 {bill_item_id: A}
    Note over UI: User double-clicks, second request fires.

    UI->>Billing: POST /charges<br/>Idempotency-Key: <ui-session>-cons (same)
    Billing->>DB: SELECT bill_items<br/>WHERE iq_tenant_id=... AND idempotency_key=...
    DB-->>Billing: existing row (bill_item_id: A)
    Billing-->>UI: 200 {bill_item_id: A} (same response)
```

**Key behaviour:**

- `UNIQUE (iq_tenant_id, idempotency_key) WHERE idempotency_key IS NOT NULL` on `bill_items` ensures at most one row per key.
- On replay, the handler returns the existing row's data — no 409, no duplicate.
- Phase 1 frontdesk UI generates the Idempotency-Key client-side as `<ui_session_id>-<line_purpose>` (e.g., `abc123-reg`, `abc123-cons`, `abc123-proc-1`).

---

## Phase 2 scenarios (sketches — for forward reference)

The following flows are deliberately **not** in Phase 1. They are sketched here so the team understands how the same schema extends, but they require Phase 2 tables (`patient_advances`, `discount_approvals`, `price_agreements`, `insurance_*`, `corporate_clients`) which Phase 1 does not ship.

### P2-Scenario A — Patient advance receipt + utilisation (Phase 2)

Patient pays ₹2000 at IPD admission (deposit); later the bill of ₹1500 is utilised against it.

```
POST /v1/billing/advances {patient_id, advance_amount:2000, ...}
   → INSERT patient_advances + INSERT payments(method=ADVANCE_RECEIPT)
POST /v1/billing/advances/{id}/utilize {bill_id, utilized_amount:1500}
   → INSERT advance_utilizations + UPDATE patient_advances balance
   → UPDATE bills.advance_adjusted
```

`SELECT ... FOR UPDATE` on the advance row + `CHECK (available_balance >= 0)` guards over-utilisation.

### P2-Scenario B — Discount with approval workflow (Phase 2)

Operator wants to apply a 20% discount on a ₹10,000 bill; threshold (in Configurator) says >15% needs `MEDICAL_SUPERINTENDENT` approval.

```
POST /v1/billing/bills/{id}/discount {discount_percentage:20, reason:'BPL'}
   → INSERT discount_approvals (status='PENDING')
   → bill remains DRAFT with no discount applied yet
Approver: POST /v1/billing/discount-approvals/{id}/approve
   → UPDATE discount_approvals + recompute bill totals + apply discount
```

Phase 1 does not have this — operators apply any % freely (the existing-prod behaviour).

### P2-Scenario C — Cashless insurance flow (Phase 2)

Pre-authorisation request → Integration Hub calls TPA → preauth_number captured → treatment proceeds with charges captured normally → claim submission at discharge → Integration Hub submits → settlement callback updates `insurance_claims` + creates `payments` row of method `INSURANCE_DISBURSEMENT` + updates `bills.insurance_paid_amount`.

See [HLD 05 §4](../../hld/05-integration-and-interop.md) for the FSM ownership split (Integration Hub owns the workflow; billing owns the data of record).

### P2-Scenario D — Partial-then-full payment (Phase 2 — not in Phase 1)

Phase 1 enforces `amount_paid == net_amount` at finalize time (existing-prod constraint). A bill that's `PARTIALLY_PAID` does not arise in Phase 1's frontdesk flow. The state exists in the schema for Phase 2+ when corporate-credit billing introduces "bill now, collect later" semantics.

---

## References

- [01-schema-design.md](./01-schema-design.md) — schema details for every table touched here
- [HLD 06 — Billing](../../hld/06-billing.md)
- [ADR-0025 — Billing module shape and phasing](../../adr/0025-billing-module-shape-and-phasing.md) — phasing rationale + lazy-explosion catalog approach
- [HLD 05 — Integration and interop](../../hld/05-integration-and-interop.md) — Integration Hub's role in Phase 2 insurance flows
- [dev-doubts/01.md](./dev-doubts/01.md) — implementation choices
