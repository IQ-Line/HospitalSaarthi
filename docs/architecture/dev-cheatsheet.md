# HIMS Dev Cheat-Sheet

**Audience:** every developer touching a `modules/*` or `services/*-svc` package, on day one and after.
**Length:** one screen per rule. Read once on day one; pin it.

The eleven rules below are the recurring foot-guns the platform's architecture asserts. Each rule is one sentence followed by what to do, what not to do, and (where useful) why. Follow the link at the bottom of each rule to dig deeper.

---

## 1. Every table has `iq_tenant_id NOT NULL`

A table without `iq_tenant_id` will fail review.

```sql
-- BAD
CREATE TABLE billing.invoices (id UUID, patient_id UUID, total NUMERIC);
-- GOOD
CREATE TABLE billing.invoices (
  id UUID PRIMARY KEY,
  iq_tenant_id UUID NOT NULL,    -- Citus distribution column
  patient_id UUID NOT NULL,
  total NUMERIC(18,4) NOT NULL
);
```

Reference: [ADR-0012](./adr/0012-multi-tenancy-isolation-strategy.md), [database principles](./analysis/03-database-principles.md).

---

## 2. Every query filters by `iq_tenant_id`

Cross-tenant data leak is the most serious bug class. The repository layer reads tenant from the request context; never trust a body-supplied tenant id.

```typescript
// BAD
db.select().from(invoices).where(eq(invoices.id, billId));
// GOOD
db.select().from(invoices).where(
  and(eq(invoices.iqTenantId, ctx.tenantId), eq(invoices.id, billId))
);
```

Reference: [ADR-0012](./adr/0012-multi-tenancy-isolation-strategy.md).

---

## 3. No cross-module imports

`modules/billing/` cannot `import` from `modules/opd/`. Cross-module communication is **events** (async) or **generated OpenAPI clients** (sync). Period.

```typescript
// BAD
import { OpdVisit } from '../opd/domain/visit';
// GOOD (sync)
import { OpdClient } from '@hims/clients-opd-v1'; // generated from specs/openapi/opd.v1.yaml
const visit = await opdClient.getVisit(visitId);
// GOOD (async)
this.events.subscribe('opd.visit.completed', this.handleVisitCompleted);
```

Reference: [CLAUDE.md](../../CLAUDE.md), [ADR-0008](./adr/0008-module-shape-and-boundaries.md), [ADR-0009](./adr/0009-event-driven-inter-module-communication.md).

---

## 4. No cross-schema foreign keys

A FK from `billing.bill_items.patient_id` to `empi.patients.id` is forbidden. Cross-module references are **soft refs** — a column of the right type, validated at write time, no FK constraint.

```sql
-- BAD
CREATE TABLE billing.bill_items (
  patient_id UUID NOT NULL REFERENCES empi.patients(id)
);
-- GOOD
CREATE TABLE billing.bill_items (
  patient_id UUID NOT NULL  -- soft ref to empi.patients.id
);
```

Reference: [analysis/03-database-principles.md](./analysis/03-database-principles.md).

---

## 5. Use-cases are functions; adapters are classes

The layer determines the paradigm. A use-case is one exported function per file. A data-access adapter is a class implementing a port.

```typescript
// modules/billing/src/use-cases/capture-charge.ts — function, one per file
export async function captureCharge(
  deps: { billRepo: BillRepo; billItemRepo: BillItemRepo; events: EventBus },
  input: CaptureChargeInput
): Promise<BillItem> { /* ... */ }

// modules/billing/src/data-access/drizzle-bill-repository.ts — class implementing the port
export class DrizzleBillRepository implements BillRepo {
  constructor(private db: Database) {}
  findOpenBillForVisit(...) { /* ... */ }
}
```

Reference: [HLD 03 §2.5](./hld/03-module-shape-template.md), [01-monorepo-setup.md §2.5](./lld/repo-structure/01-monorepo-setup.md).

---

## 6. Snapshot prices and other immutable fields on the row

If a downstream artefact (bill, prescription, FHIR bundle) must remain valid after the source catalog changes, copy the relevant fields onto the artefact row at creation time. Don't join to the catalog at read time.

```typescript
// BAD — read-time price resolution
const item = await billItemRepo.find(id);
const price = await catalog.priceOf(item.service_code); // catalog might have changed!

// GOOD — snapshot at write time
const service = await catalog.find(input.serviceCode);
await billItemRepo.insert({
  service_id: service.id,
  item_code: service.serviceCode,          // snapshot
  description: service.serviceName,         // snapshot
  unit_price: resolved.price,               // snapshot of resolved price after agreements
  tax_percentage: service.taxPercentage,   // snapshot
  ...
});
```

Reference: [ADR-0025 §snapshot-pricing](./adr/0025-billing-module-shape-and-phasing.md), [ADR-0022](./adr/0022-immutable-fhir-document-storage.md).

---

## 7. Events carry rich payloads

Every event payload includes all fields a consumer might reasonably want to project. Slim event = forced re-fetch = lost decoupling. `{id}`-only is almost always wrong.

```typescript
// BAD
this.events.publish('bill.finalized', { bill_id: bill.id });
// GOOD
this.events.publish('bill.finalized', {
  bill_id: bill.id,
  iq_tenant_id: bill.iqTenantId,
  patient_id: bill.patientId,
  visit_id: bill.visitId,
  total_amount: bill.totalAmount,
  net_amount: bill.netAmount,
  outstanding_amount: bill.outstandingAmount,
  status: bill.status,
  actor: ctx.userId,
  finalized_at: bill.approvedAt,
  // ... every field a projection might need
});
```

Reference: [CLAUDE.md](../../CLAUDE.md) ("Rich event payloads"), [ADR-0009](./adr/0009-event-driven-inter-module-communication.md).

---

## 8. Idempotency-Key on POST endpoints that retry

Any POST endpoint that a network-retrying client might call twice needs an `Idempotency-Key` header and a tenant-scoped unique index. The repository checks for an existing row before insert and returns it instead of creating a duplicate.

```typescript
const existing = await billItemRepo.findByIdempotencyKey(input.idempotencyKey, ctx.tenantId);
if (existing) return existing; // same response as first call
return billItemRepo.insert({ ...input, idempotencyKey: input.idempotencyKey });
```

Reference: [billing dev-doubts §idempotency-key-ttl](./lld/billing/dev-doubts/01.md#idempotency-key-ttl-and-storage).

---

## 9. Phase 0/1 dev knobs (the loosened defaults)

The platform ships four toggles that are loosened for Phase 0/1 POC velocity. Each has a pre-prod gate.

- `HIMS_CITUS_ENABLED=false` (local) — skip `create_distributed_table()` calls.
- `PERMISSIVE_MODE=true` (local) — Cerbos PEP logs but allows.
- `STRICT_SPEC_VALIDATION=false` (local + PR CI) — spec-vs-Fastify drift only in nightly CI.
- `env:VAR_NAME` in `integration_credentials.vault_ref` — Phase 0/1 default; migrates to a real secret store before prod.

Reference: [dev-env-simplifications.md](./dev-env-simplifications.md), [ADR-0024](./adr/0024-audit-deferred-to-pre-prod.md), HLD 05 §7.3.

---

## 10. No per-module audit table

Tempted to add `<module>_audit_log`? Don't. ADR-0024 defers audit to the centralized consumer that projects from rich domain events + structured request logs + soft-delete-by-status + your existing operational tables (workflow transitions, message logs).

Reference: [ADR-0024](./adr/0024-audit-deferred-to-pre-prod.md).

---

## 11. Soft-delete by status, not by `is_deleted`

Transactional rows transition status (`CANCELLED`, `VOIDED`, `REPLACED`). Never `is_deleted = true` on bills/payments/visits. Catalog tables use `is_active` instead.

```sql
-- BAD on a transactional table
ALTER TABLE billing.bills ADD COLUMN is_deleted BOOLEAN DEFAULT false;
-- GOOD
ALTER TABLE billing.bills ADD COLUMN status VARCHAR(16) NOT NULL DEFAULT 'DRAFT'
  CHECK (status IN ('DRAFT','FINALIZED','PARTIALLY_PAID','PAID','CLOSED','CANCELLED','REPLACED'));
```

Reference: [billing dev-doubts §soft-delete-vs-status](./lld/billing/dev-doubts/01.md#soft-delete-vs-status-on-cancellation).

---

## When in doubt

| Symptom | First place to look |
|---|---|
| "How do I structure my new module?" | [HLD 03 — Module shape template](./hld/03-module-shape-template.md) |
| "Where does this data live?" | The module's `01-schema-design.md` in `docs/architecture/lld/<module>/` |
| "What endpoints does this module expose?" | `specs/openapi/<module>.v1.yaml` |
| "What does <some flow> look like end-to-end?" | The module's `02-scenarios.md` |
| "I have an implementation choice to make" | The module's `dev-doubts/01.md` |
| "What ships in Phase 1 vs later?" | The module's `dev-guide.md` and [analysis/02-module-build-order.md](./analysis/02-module-build-order.md) |
| "Why was X decided this way?" | The relevant `ADR-NNNN-*.md` in `docs/architecture/adr/` |
