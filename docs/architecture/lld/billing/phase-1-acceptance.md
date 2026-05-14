# Billing — Phase 1 Acceptance & Standalone Test Guide

**Audience:** the developer building the billing module's Phase 1 (backend only).
**What this doc is:** the explicit "done" target. A series of `curl` commands that, when they all pass, mean Phase 1 is **implementation-complete and ready for PR review**. No frontend dependency.

Phase 1 success = the four-table schema + the seven endpoints below + the one end-to-end acceptance scenario at the bottom. That's it. If all of that works in your local dev environment with vanilla Postgres, you're done with the implementation; ship the PR.

---

## 1. Local dev setup checklist

- [ ] Postgres 16+ running locally (any Docker image works; Citus extension **not** required — see `HIMS_CITUS_ENABLED` below).
- [ ] `.env` populated. Minimum:
  ```bash
  HIMS_CITUS_ENABLED=false          # Phase 0/1 dev default (skip create_distributed_table)
  PERMISSIVE_MODE=true              # Phase 0/1 dev default (Cerbos PEP logs, doesn't enforce)
  STRICT_SPEC_VALIDATION=false      # Phase 0/1 dev default
  DATABASE_URL=postgres://hims:hims@localhost:5432/hims_dev
  ```
- [ ] Drizzle migrations applied:
  ```bash
  npx nx run billing:migrate
  ```
  Confirm the four Phase 1 tables exist:
  ```bash
  psql "$DATABASE_URL" -c "\dt billing.*"
  # Expect: billing.service_master, billing.bills, billing.bill_items, billing.payments
  ```
- [ ] Seed the demo tenant's catalog (~15-20 rows per [LLD §2.1 lazy explosion](./01-schema-design.md#21-per-doctor-pricing-in-phase-1--lazy-catalog-explosion)):
  ```bash
  npx nx run billing:seed-demo
  ```
- [ ] The OPD service is running (Phase 1 mounts billing inside `services/opd-svc`):
  ```bash
  npx nx run opd-svc:serve
  # Listens on http://localhost:3001
  ```

For these acceptance tests, you need a service-account JWT for `tenant_demo`. Set it as `TOKEN` in your shell:
```bash
export TOKEN="<paste a dev JWT here — sub=test_operator, iq_tenant_id=tenant_demo>"
export TENANT="tenant_demo"
```

Generate one with the local dev token-mint script: `npx nx run user-management:dev-mint -- --tenant=tenant_demo --sub=test_operator --role=billing_operator`.

---

## 2. The seven Phase 1 endpoints — verify each one

Each section below has one `curl` to run and the expected behaviour. Run them in order.

### 2.1 List service catalog (sanity check seed)

```bash
curl -sS -H "Authorization: Bearer $TOKEN" -H "X-Tenant-Id: $TENANT" \
  http://localhost:3001/billing/v1/billing/services | jq '.items | map(.service_code) | sort'
```

**Expected:** an array including at least `REG_FEE`, `CONS_GENERAL_DR_SMITH`, `CONS_GENERAL_DR_JONES`, `PROC_DRESSING`. If empty, the seed didn't run.

### 2.2 Capture a charge (charge-ingest API)

```bash
PATIENT_ID="11111111-1111-1111-1111-111111111111"   # seeded demo patient in EMPI

curl -sS -X POST -H "Authorization: Bearer $TOKEN" -H "X-Tenant-Id: $TENANT" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: acceptance-2.2-charge-1" \
  -d "{
    \"patient_id\": \"$PATIENT_ID\",
    \"source_module\": \"opd\",
    \"item_code\": \"REG_FEE\",
    \"quantity\": 1,
    \"performed_by\": \"22222222-2222-2222-2222-222222222222\",
    \"performed_date\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"
  }" http://localhost:3001/billing/v1/billing/charges | tee /tmp/charge-1.json | jq .
```

**Expected response (201):**
```json
{
  "bill_item_id": "<uuid>",
  "bill_id": "<uuid>",
  "snapshotted_unit_price": "100.00",
  "snapshotted_tax_percentage": "0.00",
  "net_amount": "100.00"
}
```

Capture the bill_id for next steps:
```bash
export BILL_ID=$(jq -r '.bill_id' /tmp/charge-1.json)
```

### 2.3 Capture a second charge against the same bill

```bash
curl -sS -X POST -H "Authorization: Bearer $TOKEN" -H "X-Tenant-Id: $TENANT" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: acceptance-2.3-charge-2" \
  -d "{
    \"patient_id\": \"$PATIENT_ID\",
    \"source_module\": \"opd\",
    \"item_code\": \"CONS_GENERAL_DR_SMITH\",
    \"quantity\": 1,
    \"performed_by\": \"33333333-3333-3333-3333-333333333333\",
    \"performed_date\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"
  }" http://localhost:3001/billing/v1/billing/charges | jq .
```

**Expected:** same `bill_id` in the response (charges roll up onto the existing DRAFT bill for this patient).

### 2.4 Verify idempotency — replay the same charge

```bash
curl -sS -X POST -H "Authorization: Bearer $TOKEN" -H "X-Tenant-Id: $TENANT" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: acceptance-2.2-charge-1" \
  -d "{
    \"patient_id\": \"$PATIENT_ID\",
    \"source_module\": \"opd\",
    \"item_code\": \"REG_FEE\",
    \"quantity\": 1,
    \"performed_by\": \"22222222-2222-2222-2222-222222222222\",
    \"performed_date\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"
  }" http://localhost:3001/billing/v1/billing/charges | jq '.bill_item_id'
```

**Expected:** the same `bill_item_id` from step 2.2 (replay returned the existing row, no duplicate insert). Verify in DB:
```bash
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM billing.bill_items WHERE idempotency_key='acceptance-2.2-charge-1';"
# Expect: 1
```

### 2.5 Get the bill detail

```bash
curl -sS -H "Authorization: Bearer $TOKEN" -H "X-Tenant-Id: $TENANT" \
  http://localhost:3001/billing/v1/billing/bills/$BILL_ID | jq '{status, subtotal, net_amount, items: .items | length}'
```

**Expected:**
```json
{"status": "DRAFT", "subtotal": "600.00", "net_amount": "600.00", "items": 2}
```

### 2.6 Apply a bill-level discount (no approval workflow in Phase 1)

```bash
curl -sS -X PATCH -H "Authorization: Bearer $TOKEN" -H "X-Tenant-Id: $TENANT" \
  -H "Content-Type: application/json" \
  -d '{"discount_percentage": "10", "discount_reason": "Senior citizen"}' \
  http://localhost:3001/billing/v1/billing/bills/$BILL_ID | jq '{discount_amount, discount_percentage, net_amount}'
```

**Expected:**
```json
{"discount_amount": "60.00", "discount_percentage": "10.00", "net_amount": "540.00"}
```

### 2.7 Finalize the bill

```bash
curl -sS -X POST -H "Authorization: Bearer $TOKEN" -H "X-Tenant-Id: $TENANT" \
  http://localhost:3001/billing/v1/billing/bills/$BILL_ID/finalize | jq '{status, bill_number}'
```

**Expected:**
```json
{"status": "FINALIZED", "bill_number": "B-DEMO-20260514-000001"}
```

(Date and sequence will reflect today's run.)

### 2.8 Verify the bill rejects writes once non-DRAFT

```bash
curl -sS -X POST -H "Authorization: Bearer $TOKEN" -H "X-Tenant-Id: $TENANT" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: acceptance-2.8-charge-should-fail" \
  -d "{
    \"patient_id\": \"$PATIENT_ID\",
    \"source_module\": \"opd\",
    \"item_code\": \"PROC_DRESSING\",
    \"quantity\": 1,
    \"performed_by\": \"33333333-3333-3333-3333-333333333333\",
    \"performed_date\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"
  }" http://localhost:3001/billing/v1/billing/charges
```

**Expected:** 409 Conflict with body indicating the bill is not in DRAFT and a new bill is required. (Alternative pass: 201 Created with a *new* bill_id — meaning the system opens a fresh bill because the previous one is finalized. Either behaviour is acceptable for Phase 1; document which one your implementation chose.)

### 2.9 Record the payment

```bash
curl -sS -X POST -H "Authorization: Bearer $TOKEN" -H "X-Tenant-Id: $TENANT" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: acceptance-2.9-payment" \
  -d "{
    \"bill_id\": \"$BILL_ID\",
    \"amount\": \"540.00\",
    \"payment_method\": \"CASH\",
    \"received_by\": \"22222222-2222-2222-2222-222222222222\"
  }" http://localhost:3001/billing/v1/billing/payments | jq '{payment_id, receipt_number, bill_status: .bill.status}'
```

**Expected:**
```json
{"payment_id": "<uuid>", "receipt_number": "R-DEMO-20260514-000001", "bill_status": "PAID"}
```

### 2.10 Fetch the receipt PDF (or HTML fallback)

```bash
curl -sS -H "Authorization: Bearer $TOKEN" -H "X-Tenant-Id: $TENANT" \
  -o /tmp/receipt.pdf \
  http://localhost:3001/billing/v1/billing/bills/$BILL_ID/receipt.pdf
file /tmp/receipt.pdf
```

**Expected:** `/tmp/receipt.pdf: PDF document` (or HTML if you chose the client-print fallback per [dev-doubts §receipt-pdf-generation](./dev-doubts/01.md#receipt-pdf-generation)). Open it and verify it shows patient name (from EMPI cache lookup), bill number, both line items, the discount, and the payment.

---

## 3. The end-to-end acceptance scenario (run this last)

**This is the canonical Phase 1 acceptance.** When all the steps above are individually passing, run this script end-to-end. It replays [Scenario 1](./02-scenarios.md#scenario-1--new-patient-opd-registration-the-production-parity-flow) (new patient OPD registration → bill → payment → receipt) as a single sequence.

```bash
# Pre-conditions:
# - A fresh patient_id created in EMPI for this run
# - All env vars set as above

bash docs/architecture/lld/billing/acceptance-script.sh
```

(That script — to be written by the dev — calls EMPI to create a patient, then performs steps 2.2 through 2.10 in sequence, then asserts the final state in the DB.)

Final DB-state assertions the script must verify:

```sql
-- Exactly one PAID bill for this patient with the right total
SELECT bill_number, status, net_amount, paid_amount, outstanding_amount
FROM billing.bills
WHERE iq_tenant_id = :tenant AND patient_id = :patient;
-- Expect: 1 row, status=PAID, net_amount=540, paid_amount=540, outstanding_amount=0

-- Exactly two bill_items, both ACTIVE, with snapshot prices
SELECT item_code, unit_price, status FROM billing.bill_items
WHERE iq_tenant_id = :tenant AND bill_id = :bill;
-- Expect: 2 rows (REG_FEE 100.00 ACTIVE, CONS_GENERAL_DR_SMITH 500.00 ACTIVE)

-- Exactly one SUCCESS payment with a receipt number
SELECT payment_method, amount, status, receipt_number FROM billing.payments
WHERE iq_tenant_id = :tenant AND bill_id = :bill;
-- Expect: 1 row, CASH 540.00 SUCCESS, receipt_number not null
```

---

## 4. What "done" means

Phase 1 is **done** when:

1. All four Phase 1 tables exist with the columns in [`schema-reference.json`](./schema-reference.json) (run the diff check below).
2. All seven endpoints in §2 above respond with the expected shapes.
3. Idempotency-Key replay (§2.4) returns the same `bill_item_id`.
4. The end-to-end script in §3 passes against a fresh demo tenant.
5. `npx nx run billing:test` passes (the dev's unit + integration tests).
6. `npx nx run billing:lint` passes.

Schema-diff check:
```bash
# Each Phase 1 table's column list matches schema-reference.json
for table in service_master bills bill_items payments; do
  echo "=== $table ==="
  diff \
    <(jq -r ".entities.$table.columns | keys[]" docs/architecture/lld/billing/schema-reference.json | sort) \
    <(psql "$DATABASE_URL" -tAc "SELECT column_name FROM information_schema.columns WHERE table_schema='billing' AND table_name='$table' ORDER BY column_name;")
done
```

Each table's diff must be empty.

---

## 5. What is NOT in scope for Phase 1 acceptance

If your implementation includes any of the following, it's over-scope — flag it for the Phase 2 PR instead:

- Endpoints under the `Advances`, `Discount Approvals`, `Price Agreements` tags in [`billing.v1.yaml`](../../../../specs/openapi/billing.v1.yaml). These are tagged `[Phase 2 — NOT in Phase 1]`.
- Approval-workflow logic on discounts (`discount_approvals` table, threshold lookup, approver dashboard).
- Insurance flow endpoints (pre-auth, claim submission, settlement).
- Refund endpoints (Phase 3).
- Doctor commission accruals (Phase 4).
- A `billing_audit_log` table — [ADR-0024](../../adr/0024-audit-deferred-to-pre-prod.md).

---

## 6. PR readiness checklist

- [ ] All §2 endpoints behave as documented.
- [ ] §3 acceptance script passes.
- [ ] §4 schema-diff check is clean for all four Phase 1 tables.
- [ ] Unit tests cover each use-case happy path + the immutability invariant (charges on non-DRAFT bills) + idempotency replay.
- [ ] Vitest integration test runs the §3 script as a Vitest case.
- [ ] No Phase 2+ tables / endpoints / use-cases implemented (per §5).
- [ ] `dev-doubts/01.md` updated if you took a deviation from the recommendation in any of the deferred choices (bill number format, money type, immutability enforcement, receipt PDF, idempotency-key TTL, lab/pharmacy charge timing, transactionality boundaries).
- [ ] `npx nx affected -t test` and `npx nx affected -t lint` both green.

Once all boxes are checked, raise the PR against `dev`. The PR description should link to this doc and confirm each checkbox.

---

## References

- [LLD 01 — schema design](./01-schema-design.md) — column-level detail
- [LLD 02 — scenarios](./02-scenarios.md) — Scenario 1 is the canonical end-to-end flow
- [orientation.md](./orientation.md) — the 4-5 files a dev edits most
- [dev-guide.md](./dev-guide.md) — phased build checklist (1a-1g)
- [dev-doubts/01.md](./dev-doubts/01.md) — implementation choices with recommendations
- [billing.v1.yaml](../../../../specs/openapi/billing.v1.yaml) — full API contract
- [dev-env-simplifications.md](../../dev-env-simplifications.md) — the Phase 0/1 env knobs
- [ADR-0025](../../adr/0025-billing-module-shape-and-phasing.md) — phasing rationale
