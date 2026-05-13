# Billing — Scenarios

**Module:** Billing
**Related:** [01-schema-design.md](./01-schema-design.md) | [HLD 06 — Billing](../../hld/06-billing.md) | [ADR-0025](../../adr/0025-billing-module-shape-and-phasing.md)

This document walks through the Phase 1 (and select Phase 2) happy-path and corner-case flows that the schema supports. Sequence diagrams use Mermaid. Actors:

- **Operator** — counter / cashier / billing clerk at the desk; uses the web BFF.
- **Doctor** — clinician finalising an OPD/IPD/Lab event from the clinical module.
- **Clinical Module** — OPD, IPD, Lab, Pharmacy, Radiology, etc. Phase 1 = OPD only.
- **Billing** — the `modules/billing` library (embedded in `services/opd-svc` in Phase 1).
- **EMPI** — patient identity service.
- **Configurator** — config / threshold lookup.
- **Bus** — the in-process event bus ([ADR-0017](../../adr/0017-in-process-event-bus-phase-0.md)) in Phase 1; replaced by the durable bus in Phase 2+.

---

## Scenario 1 — Single OPD charge → bill → cash payment → receipt (Phase 1 parity flow)

The happy path that reproduces the production HIMS OPD counter flow exactly.

```mermaid
sequenceDiagram
    actor Doctor
    actor Operator
    participant OPD as OPD module
    participant Billing as Billing module
    participant EMPI
    participant DB as billing.*
    participant Bus as Event bus

    Doctor->>OPD: Finalize consultation<br/>(patient_id, visit_id, "OP-CONS-GENERAL")
    OPD->>Billing: POST /v1/billing/charges<br/>{patient_id, visit_id, source_module:"opd",<br/> item_code:"OP-CONS-GENERAL", quantity:1,<br/> performed_by:doctor_id, ...}<br/>Idempotency-Key: clinical-row-uuid
    Billing->>DB: Resolve item via service_master<br/>+ price_agreements
    Billing->>DB: SELECT bills WHERE patient_id=... AND visit_id=...<br/>AND status='DRAFT'
    Note over Billing,DB: No open bill → create new DRAFT bill
    Billing->>DB: INSERT bills (DRAFT, totals=0)
    Billing->>DB: INSERT bill_items (snapshot price/tax,<br/>source_module='opd', source_ref=row_id)
    Billing->>DB: UPDATE bills (subtotal, tax_amount, net_amount)
    Billing-->>OPD: 201 {bill_item_id, bill_id,<br/>snapshotted_unit_price, net_amount}
    Bus-->>Billing: bill.created
    Bus-->>Billing: bill.item-added

    Note over Operator,Billing: Patient arrives at counter
    Operator->>Billing: GET /v1/billing/bills/{bill_id}
    Billing-->>Operator: bill detail (DRAFT, items, total ₹590)
    Operator->>Billing: POST /v1/billing/bills/{bill_id}/finalize
    Billing->>DB: SELECT ... FOR UPDATE on bill
    Billing->>DB: UPDATE bills SET status='FINALIZED',<br/>generate bill_number, approved_by=:operator,<br/>approved_at=now()
    Billing-->>Operator: 200 {bill_number, status:'FINALIZED'}
    Bus-->>Billing: bill.finalized

    Operator->>Billing: POST /v1/billing/payments<br/>{bill_id, amount:590, payment_method:'CASH',<br/>received_by:operator_id}
    Billing->>DB: SELECT bills FOR UPDATE
    Billing->>DB: INSERT payments (SUCCESS, receipt_number gen)
    Billing->>DB: UPDATE bills SET paid_amount=590,<br/>outstanding_amount=0, status='PAID'
    Billing-->>Operator: 201 {payment_id, receipt_number, status:'PAID'}
    Bus-->>Billing: payment.received

    Operator->>Billing: GET /v1/billing/receipts/{payment_id}.pdf
    Billing->>EMPI: GET /v1/patients/{patient_id}<br/>(display name, ABHA — cacheable)
    EMPI-->>Billing: patient display fields
    Billing-->>Operator: PDF receipt
```

**What the schema enforces:**

- The `Idempotency-Key` on charge-ingest ensures that if OPD retries the call (network blip, clinical-row save before billing ack), the same `bill_items` row is returned, not a new one.
- The bill cannot accept a payment in `DRAFT` status (`CHECK (status != 'DRAFT' OR paid_amount = 0)`).
- The `bills.outstanding_amount = net_amount - paid_amount - advance_adjusted` invariant is re-asserted in every payment transaction.
- The snapshotted `bill_items.unit_price` and `tax_percentage` are immutable; a future change to `service_master.base_price` does not retroactively change the receipt.

---

## Scenario 2 — Multi-charge OPD visit (consultation + procedure + lab)

A single OPD visit produces three charges from three modules (OPD consultation, OPD procedure, Lab test order). They accumulate onto one bill.

```mermaid
sequenceDiagram
    actor Doctor
    participant OPD as OPD module
    participant Lab as Lab module
    participant Billing as Billing module
    participant DB

    Doctor->>OPD: Finalize consultation
    OPD->>Billing: POST /charges (OP-CONS-GENERAL)<br/>Idempotency-Key: opd-cons-row-uuid
    Billing->>DB: No open bill → create DRAFT bill
    Billing->>DB: INSERT bill_items (consultation, source_module='opd')
    Billing-->>OPD: bill_item_id

    Doctor->>OPD: Add procedure (small wound dressing)
    OPD->>Billing: POST /charges (OP-PROC-DRESSING)<br/>Idempotency-Key: opd-proc-row-uuid
    Billing->>DB: SELECT bills ... DRAFT → existing bill_id
    Billing->>DB: INSERT bill_items (procedure)
    Billing->>DB: UPDATE bills (re-roll subtotal/tax/net)
    Billing-->>OPD: bill_item_id

    Doctor->>Lab: Order lab test (CBC)
    Lab->>Billing: POST /charges (LAB-CBC)<br/>Idempotency-Key: lab-order-row-uuid<br/>source_module='lab', visit_id matches
    Note over Lab,Billing: Charge captured at order time, not at result-finalise
    Billing->>DB: SELECT bills ... DRAFT → same bill_id<br/>(visit_id matches)
    Billing->>DB: INSERT bill_items (lab, source_module='lab')
    Billing->>DB: UPDATE bills totals
    Billing-->>Lab: bill_item_id
```

**Key behaviour:**

- Three modules emit charges; one bill accumulates them because `(patient_id, visit_id)` is shared.
- Each `bill_items` row carries `source_module` and `source_ref`, so reverse-lookup from a clinical row to its billing line is always possible.
- The bill stays in `DRAFT` until the operator finalises. New charges may still be added while it is `DRAFT`.
- Whether Lab posts a charge *at order time* (Phase 1 default) or *at result-finalise time* is a [dev-doubt](./dev-doubts/01.md#lab-charge-timing); the schema supports both.

---

## Scenario 3 — Patient advance receipt and utilisation

Patient pays ₹2000 in advance at the start of an IPD stay; later the bill of ₹1500 is utilised against the advance, leaving ₹500 available.

```mermaid
sequenceDiagram
    actor Operator
    participant Billing
    participant DB
    participant Bus

    Operator->>Billing: POST /v1/billing/advances<br/>{patient_id, advance_amount:2000,<br/> payment_method:'CASH', advance_type:'IPD_DEPOSIT',<br/> visit_id (admission), received_by}
    Billing->>DB: INSERT payments (ADVANCE_RECEIPT, 2000)
    Billing->>DB: INSERT patient_advances<br/>(advance_amount=2000, utilized=0,<br/> available_balance=2000, status='AVAILABLE',<br/> payment_id ref)
    Billing-->>Operator: 201 {advance_id, receipt_number,<br/>available_balance:2000}
    Bus-->>Billing: advance.received

    Note over Operator,Billing: Days later, IPD bill finalised

    Operator->>Billing: POST /v1/billing/advances/{advance_id}/utilize<br/>{bill_id, utilized_amount:1500}
    Billing->>DB: SELECT patient_advances FOR UPDATE
    Note over Billing,DB: Validate available_balance >= 1500
    Billing->>DB: INSERT advance_utilizations (1500)
    Billing->>DB: UPDATE patient_advances<br/>SET utilized_amount=1500,<br/>available_balance=500
    Billing->>DB: UPDATE bills SET advance_adjusted=1500,<br/>outstanding_amount = net_amount - paid - 1500
    Billing-->>Operator: 200 {advance available_balance:500,<br/>bill outstanding:0 or remaining}
    Bus-->>Billing: advance.utilized
```

**Key behaviour:**

- `SELECT ... FOR UPDATE` on the advance row serialises concurrent utilisations against the same advance.
- `CHECK (available_balance >= 0)` guards against double-spend at the DB level.
- `bills.advance_adjusted` is incremented; `outstanding_amount` is re-derived.
- A second utilisation of ₹500 against another bill works the same way; on third utilisation that would breach the balance, the CHECK constraint fails and the application returns `409 Conflict`.

---

## Scenario 4 — Discount with approval (above threshold)

Operator wants to apply a 20% discount on a ₹10,000 bill. Threshold table says >15% needs `MEDICAL_SUPERINTENDENT` approval.

```mermaid
sequenceDiagram
    actor Operator
    actor Approver as Approver<br/>(Med. Superintendent)
    participant Billing
    participant Cfg as Configurator
    participant DB
    participant Bus

    Operator->>Billing: POST /v1/billing/bills/{bill_id}/discount<br/>{discount_type:'PERCENTAGE', discount_value:20,<br/> reason:'BPL', reason_category:'BPL'}
    Billing->>Cfg: GET discount_approval_policies (cached)
    Cfg-->>Billing: thresholds map
    Note over Billing: 20% > 15% → APPROVAL_REQUIRED
    Billing->>DB: INSERT discount_approvals<br/>(status='PENDING', requested_by=operator,<br/>approval_level='MEDICAL_SUPERINTENDENT')
    Billing-->>Operator: 202 Accepted<br/>{discount_approval_id, status:'PENDING'}
    Bus-->>Billing: discount.requested

    Note over Operator,Approver: Operator sends approver a notification<br/>(or approver checks their dashboard)

    Approver->>Billing: GET /v1/billing/discount-approvals?status=PENDING
    Billing-->>Approver: [{discount_approval_id, bill summary, reason, ...}]
    Approver->>Billing: POST /v1/billing/discount-approvals/{id}/approve<br/>{remarks:'BPL document verified'}
    Billing->>DB: UPDATE discount_approvals<br/>SET status='APPROVED', approved_by=approver,<br/>approved_at=now()
    Billing->>DB: UPDATE bill_items (or bills) SET discount_amount,<br/>recompute net/tax/total
    Billing->>DB: UPDATE bills SET discount_amount,<br/>total_amount, net_amount, outstanding_amount
    Billing-->>Approver: 200 OK
    Bus-->>Billing: discount.approved
```

**Key behaviour:**

- Operator request is non-blocking — the bill remains in `DRAFT` with the discount pending. A separate workflow loop pushes notifications to approvers (out of billing scope).
- On approval, billing recomputes line and bill totals atomically.
- If the approver rejects, `discount_approvals.status='REJECTED'`; bill remains unchanged.
- A ≤5% discount applied by the operator bypasses this workflow entirely — the bill_items row's `discount_amount` is set directly and no approval row is created.

---

## Scenario 5 — Bill amendment (replacement chain)

A finalised bill of ₹5000 is discovered to have a wrong procedure code (the actual procedure was cheaper). The bill is amended.

```mermaid
sequenceDiagram
    actor Operator
    participant Billing
    participant DB
    participant Bus

    Operator->>Billing: POST /v1/billing/bills/{bill_id}/amend<br/>{reason:'wrong procedure code on item X'}
    Billing->>DB: SELECT bills FOR UPDATE (original)
    Note over Billing,DB: Validate status IN ('FINALIZED','PARTIALLY_PAID','PAID')
    Billing->>DB: INSERT bills (NEW row, status='DRAFT',<br/>replaced_bill_id=original.id,<br/>patient_id, visit_id copied,<br/>bill_number=NULL until finalised)
    Billing->>DB: INSERT bill_items (NEW rows, copy of original<br/>EXCEPT corrected item)
    Billing->>DB: UPDATE original bill SET status='REPLACED'
    Billing-->>Operator: 201 {new_bill_id, status:'DRAFT'}
    Bus-->>Billing: bill.amended<br/>(old_bill_id, new_bill_id, reason)

    Operator->>Billing: PATCH /v1/billing/bills/{new_bill_id}/items/{item_id}<br/>{quantity, unit_price overridden manually,<br/> item_type='ADJUSTMENT'}
    Note over Billing,DB: bill_items immutability check —<br/>parent is DRAFT, allowed
    Billing->>DB: UPDATE bill_items (corrected line)
    Billing->>DB: UPDATE bills totals
    Operator->>Billing: POST /v1/billing/bills/{new_bill_id}/finalize
    Billing->>DB: UPDATE bills SET status='FINALIZED',<br/>bill_number generated
    Billing-->>Operator: 200 OK

    Note over Operator,Billing: If original bill was PAID:<br/>excess payment becomes a refund (Phase 3)<br/>or an advance (Phase 1 workaround)
    Operator->>Billing: POST /v1/billing/advances<br/>{patient_id, advance_amount: ₹X overpaid,<br/>advance_type:'GENERAL', payment_method:'PRIOR_PAYMENT_ADJUSTMENT'}
```

**Key behaviour:**

- The original bill row is preserved with `status='REPLACED'` — never DELETED.
- The new bill carries `replaced_bill_id` pointing back. The audit trail is the chain.
- Until Phase 3 refunds ship, an overpayment from the original becomes a `patient_advances` row that can be utilised against future bills. The dev-doubts doc records this Phase 1 workaround.

---

## Scenario 6 — Partial payment, then full payment

Patient pays ₹500 of a ₹2000 bill in cash today; pays the remaining ₹1500 by card next week.

```mermaid
sequenceDiagram
    actor Operator
    participant Billing
    participant DB

    Operator->>Billing: POST /v1/billing/bills/{bill_id}/finalize
    Billing->>DB: UPDATE bills SET status='FINALIZED'

    Operator->>Billing: POST /v1/billing/payments<br/>{bill_id, amount:500, payment_method:'CASH'}
    Billing->>DB: SELECT bills FOR UPDATE
    Billing->>DB: INSERT payments (500, SUCCESS)
    Billing->>DB: UPDATE bills SET paid_amount=500,<br/>outstanding_amount=1500,<br/>status='PARTIALLY_PAID'
    Billing-->>Operator: 201 {receipt_number, status:'PARTIALLY_PAID'}

    Note over Operator,Billing: Next week
    Operator->>Billing: POST /v1/billing/payments<br/>{bill_id, amount:1500, payment_method:'CARD',<br/>card_last4:'1234', authorization_code:'XYZ'}
    Billing->>DB: SELECT bills FOR UPDATE
    Billing->>DB: INSERT payments (1500, SUCCESS)
    Billing->>DB: UPDATE bills SET paid_amount=2000,<br/>outstanding_amount=0, status='PAID'
    Billing-->>Operator: 201 {receipt_number, status:'PAID'}
```

---

## Scenario 7 — Bill cancellation (post-finalize)

Patient walked out without paying; bill needs to be cancelled, advances released back.

```mermaid
sequenceDiagram
    actor Operator
    actor Approver
    participant Billing
    participant DB

    Note over Operator: Bill is PARTIALLY_PAID;<br/>patient has gone

    Operator->>Billing: POST /v1/billing/bills/{bill_id}/cancel<br/>{reason:'patient absconded',<br/>approver_id:approver_id}
    Note over Billing: Configurable: post-finalize cancel<br/>requires approval. Phase 1 check is application-layer.
    Billing->>DB: SELECT bills FOR UPDATE
    Note over Billing,DB: Validate status IN ('DRAFT','FINALIZED','PARTIALLY_PAID')
    Billing->>DB: UPDATE bills SET status='CANCELLED',<br/>cancellation_reason=..., cancelled_by=...,<br/>cancelled_at=now()
    Note over Billing,DB: Released advances:<br/>UPDATE patient_advances<br/>SET utilized_amount -= released,<br/>available_balance += released<br/>(Soft-delete the advance_utilizations rows)
    Billing-->>Operator: 200 {bill status:'CANCELLED', payments retained}

    Note over Operator,Billing: Paid amounts remain as payments rows;<br/>they become refunds in Phase 3 (or<br/>unallocated advances as the Phase 1 workaround).
```

---

## Scenario 8 — Idempotent charge-ingest replay

OPD's `finalize-consultation` use-case posts a charge, but the response is lost (network blip). OPD retries with the same `Idempotency-Key`.

```mermaid
sequenceDiagram
    participant OPD
    participant Billing
    participant DB

    OPD->>Billing: POST /charges<br/>Idempotency-Key: clinical-row-uuid
    Billing->>DB: INSERT bill_items<br/>idempotency_key=clinical-row-uuid
    Billing-->>OPD: 201 {bill_item_id: A}
    Note over OPD: Response lost. OPD's outbox retries.

    OPD->>Billing: POST /charges<br/>Idempotency-Key: clinical-row-uuid (same)
    Billing->>DB: SELECT bill_items<br/>WHERE iq_tenant_id=... AND idempotency_key=...
    DB-->>Billing: existing row (bill_item_id: A)
    Billing-->>OPD: 200 {bill_item_id: A}<br/>(same response as before)
```

**Key behaviour:**

- The `UNIQUE (iq_tenant_id, idempotency_key)` partial index on `bill_items` ensures at most one row exists per key.
- On replay, the handler reads the existing row and returns the same response, not 409.
- TTL for the idempotency-key uniqueness window is a [dev-doubt](./dev-doubts/01.md#idempotency-key-ttl); recommendation is "keep for 30 days then sweep with a job."

---

## Scenario 9 — Phase 2 sketch: cashless insurance with pre-authorisation

The Phase 2 cashless flow involves Integration Hub for transport and FSM, and billing for data. This sketch shows the cross-module choreography.

```mermaid
sequenceDiagram
    actor Operator
    participant Billing
    participant IntgHub as Integration Hub
    participant TPA as TPA / Insurer API

    Operator->>Billing: POST /v1/billing/insurance/preauth<br/>{patient_id, policy_id, estimated_amount,<br/> diagnosis, planned_procedures}
    Billing->>IntgHub: POST /v1/abdm-or-tpa/preauth<br/>(payload built from policy + bill draft)
    IntgHub->>TPA: TPA-specific call
    TPA-->>IntgHub: preauth_number, approved_amount
    IntgHub-->>Billing: 200 {preauth_number, approved_amount}
    Billing->>DB: UPDATE insurance_claims<br/>SET pre_auth_number, pre_auth_amount
    Billing-->>Operator: 200 OK

    Note over Operator,Billing: Treatment proceeds, charges captured normally

    Note over Operator: At discharge / visit close
    Operator->>Billing: POST /v1/billing/insurance/submit-claim<br/>{bill_id}
    Billing->>IntgHub: POST /v1/abdm-or-tpa/submit-claim<br/>(full bill + supporting docs)
    IntgHub->>TPA: TPA-specific submission
    TPA-->>IntgHub: ack + claim reference
    IntgHub-->>Billing: 202 Accepted {insurance_reference_number}
    Billing->>DB: UPDATE insurance_claims SET<br/>status='SUBMITTED', submission_date=now(),<br/>insurance_reference_number=...
    Billing->>DB: UPDATE bills SET insurance_claim_amount=...

    Note over IntgHub,TPA: Days/weeks later, TPA settles

    TPA-->>IntgHub: settlement callback<br/>(approved/rejected amounts, deductions)
    IntgHub-->>Billing: insurance-claim.settled event
    Billing->>DB: UPDATE insurance_claims SET status='SETTLED',<br/>approved_amount, deductions, payment_date
    Billing->>DB: INSERT payments (method='INSURANCE_DISBURSEMENT',<br/>amount=approved_amount, claim_id=...)
    Billing->>DB: UPDATE bills SET insurance_paid_amount,<br/>patient_payable, outstanding_amount
```

**Ownership recap** (per [HLD 05 §4](../../hld/05-integration-and-interop.md)):

| Concern | Owner |
|---|---|
| FSM for cashless / reimbursement flow | Integration Hub |
| Transport to TPA / insurer | Integration Hub |
| The data of the claim (amounts, status, audit) | Billing's `insurance_claims` |
| Roll-up onto `bills.insurance_*_amount` | Billing |

---

## Scenario 10 — Charge-ingest failure handling (Phase 1)

OPD's charge-ingest call fails: billing is unavailable, network error, or 500.

**Phase 1 (embedded):** OPD and billing share a process. If billing fails, OPD likely fails too — there is no separation to recover from. The clinical-row save in OPD is the persistent state; on operator-driven retry, the charge can be re-posted.

**Phase 2+ (extracted):**

```mermaid
sequenceDiagram
    participant OPD
    participant OPDOutbox as OPD outbox
    participant Billing
    participant Retry as Retry worker

    OPD->>OPD: Save consultation row
    OPD->>OPDOutbox: Enqueue charge<br/>{Idempotency-Key, payload}
    OPD-->>OPD: Return to UI (success)
    OPDOutbox->>Billing: POST /charges (async)
    alt Success
        Billing-->>OPDOutbox: 201 OK
        OPDOutbox->>OPDOutbox: Mark sent
    else Failure (transient)
        Billing-->>OPDOutbox: 503
        OPDOutbox->>Retry: backoff schedule
        Retry->>Billing: POST /charges (retry, same Idempotency-Key)
        Billing-->>Retry: 200 OK (idempotent — finds existing row OR creates one)
    end
```

**Key behaviour:**

- The clinical flow does not block on billing availability.
- The outbox preserves the charge intent; the same Idempotency-Key prevents duplicates.
- After N retries, the outbox surfaces a persistent failure to an ops dashboard. Manual reconciliation is possible because the source clinical row is the recoverable truth.

---

## References

- [01-schema-design.md](./01-schema-design.md) — schema details for every table touched here
- [HLD 06 — Billing](../../hld/06-billing.md)
- [ADR-0025 — Billing module shape and phasing](../../adr/0025-billing-module-shape-and-phasing.md)
- [HLD 05 — Integration and interop](../../hld/05-integration-and-interop.md) — Integration Hub's role in Phase 2 insurance flows
- [Integration Platform FSM specifications](../integration-platform/02-fsm-specifications.md) — the FSM that drives a cashless claim
- [dev-doubts/01.md](./dev-doubts/01.md) — implementation choices the developer makes
