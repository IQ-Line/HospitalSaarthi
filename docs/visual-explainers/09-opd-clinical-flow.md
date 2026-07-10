---
title: The OPD patient journey across modules
objective: Trace one out-patient visit end-to-end — front-desk registration → OP visit → doctor consultation → billing → pharmacy dispense — and show which module owns each step, how they actually talk (HTTP, not events), and where the seams and gaps really are.
---

A patient walks up to the OPD counter. By the time they leave with medicines, **five modules in two languages** have each written a row in **their own schema**, coordinated almost entirely by **synchronous HTTP calls**. This page follows that patient and names the real mechanism at every hop — because the code and the architecture docs disagree in two places, and *code wins*.

The cast (each owns a Postgres schema of the same name):

- **`registration`** (TS, `registration-svc`) — front-desk intake: who arrived, for what visit, allocates the **OP visit number**. Owns the intake row (ADR-0029).
- **`empi`** (TS) — patient identity: UHID allocation, demographics, ABHA linkage.
- **`opd`** (**Python**, FastAPI) — the clinical encounter: vitals, diagnosis, prescription.
- **`billing`** (TS) — the OP bill, service line-items, payments.
- **`pharmacy`** (TS) — the dispense queue (a projection) and the dispense record.
- **`inventory`** (TS) — stock, batches, transfers. *In the OPD flow today: not wired in — see the gap below.*

```callout tone=decision title="The one thing to internalise: it's HTTP-first"
Every cross-module hop in this journey is a **direct HTTP call** through a typed gateway (`lib/http-*-gateway.ts` on the TS side, `lib/http_*_gateway.py` on Python). The domain events that registration publishes (`registration.visit.created`, `registration.registration.created`) go onto an **in-process bus with zero subscribers** in this flow — they are a deliberate Phase-0 façade, not the coupling that makes the journey work. Verified: `grep -rn '.subscribe(' modules` finds real consumers only for ABDM-M2 and the UM entitlement cache — neither is on the OPD path.
```

<!-- chapter: The end-to-end flow -->

One out-patient visit, from counter to counter. Solid arrows are HTTP calls that actually carry the flow; the dashed self-note is the event that goes nowhere.

```diagram title="OPD visit: registration → consultation → billing → pharmacy" look=clean
sequenceDiagram
  participant FD as Front desk (UI)
  participant REG as registration-svc (TS)
  participant EMPI as empi (TS)
  participant OPD as opd (Python)
  participant BILL as billing (TS)
  participant PH as pharmacy (TS)

  FD->>REG: POST /registrations (intake + billing)
  REG->>EMPI: registerPatient (HTTP) — UHID + patient_id
  EMPI-->>REG: patient_id, snapshot (or 409 duplicate)
  REG->>REG: write registration + visit rows, allocate OP visit no.
  Note over REG,OPD: no push from registration to OPD —<br/>OPD learns the visit by reading registration.visit cross-schema
  REG->>BILL: create OP bill + items (HTTP billingWritePort)
  BILL-->>REG: bill_id
  REG--)REG: publish registration.visit.created (in-proc bus, 0 consumers)
  REG-->>FD: 201 (registration + visit + bill_id)

  Note over OPD: Doctor consults — writes the prescription aggregate
  OPD->>OPD: vitals, diagnosis, medicines… finalize prescription
  OPD->>PH: upsert_queue_projection (HTTP) on finalize
  Note over PH: dispense queue row appears (a projection of OPD state)
  PH->>PH: dispense: write dispense + line items (stock_batch_id soft ref)
  Note over PH: NO inventory decrement call today — see gap
```

The steps, named by owner:

```steps
# Front desk submits intake
reuse modules/registration/src/use-cases/complete-opd-new-patient-registration.ts — orchestrates the whole intake
> One use-case fans out to EMPI, then billing, then completes the visit. All failures are typed by phase (intake / billing / complete).

# EMPI allocates identity
reuse modules/registration/src/lib/http-empi-gateway.ts — registerPatient over HTTP
> A real duplicate comes back as a structured 409 with the existing patient_id; EMPI-unavailable is passed through verbatim.

# Registration writes the intake + visit rows
reuse modules/registration/src/use-cases/create-visit.ts — allocates the OP visit number, inserts the visit
> Registration owns its OWN sequence_counters table for the OP visit stream (no shared counter module). Idempotency-keyed insert.

# OPD records the clinical encounter
reuse modules/opd/src/opd/models/prescription/prescription.py — the prescription IS the encounter
> Vitals, chief complaints, diagnoses, symptoms, medical history, medicines, ordered tests/imaging, vaccines, procedures, care plan.

# Billing raises the OP bill
reuse modules/registration/src/lib/opd-registration-billing.ts — drives billingWritePort during intake
> Bill + bill_items + payments live in the billing schema. Registration triggers it; billing owns the money math.

# Pharmacy dispenses against the queue
reuse modules/pharmacy/src/use-cases/save-dispense-for-visit.ts — validates against the live OPD prescription, writes dispense
> The queue row was pushed by OPD on prescription finalize; dispense reconciles prescribed vs dispensed quantities.
```

<!-- chapter: How the modules actually talk -->

Three distinct mechanisms are in play. Knowing which is which is the whole point.

```callout tone=warning title="One doc-vs-code contradiction — code wins (and one resolved)"
**Cross-schema reads happen, despite "no cross-schema FKs".** CLAUDE.md says modules own separate schemas and talk via events/API. OPD's patients-queue genuinely `SELECT`s from `registration.visit` (same Postgres, read-only, no FK). The model's own docstring calls it a stopgap "until an event projection or generated client replaces this coupling."

**Resolved 2026-07-10:** registration used to fire a best-effort `ensureEncounter` → `PUT /api/v1/opd/visits/{id}/encounter` on every visit — a route OPD never implemented (warn-logged, returned 201 anyway). That dead call path (port, gateway, plumbing, tests) has been deleted; the cross-schema read above is, explicitly, how OPD learns of visits until reach-in #2 lands the real mechanism.
```

The events that fire vs. what actually moves data:

| Signal | Publisher | Real consumer | What carries the flow instead |
|---|---|---|---|
| `registration.registration.created` | `registration` create-registration | **none** (in-proc bus) | — façade only |
| `registration.visit.created` | `registration` create-visit | **none** (in-proc bus) | OPD **cross-schema read** of `registration.visit` |
| patient identity | `registration` → EMPI (HTTP) | EMPI `registerPatient` | direct HTTP gateway |
| OP bill | `registration` → billing (HTTP) | billing write port | direct HTTP gateway |
| Rx → dispense queue | **OPD** `pharmacy_queue_notify.py` (HTTP) | pharmacy `upsert_queue_projection` | direct HTTP push on Rx finalize |

```code lang=python file=modules/opd/src/opd/lib/pharmacy_queue_notify.py hl=6
# On POST /prescriptions/{id}/finalize, OPD pushes a queue projection to pharmacy.
def _upsert_projection(tenant_id, visit_id, *, patient_id, prescription_id,
                       doctor_id, visit_status, prescription_status,
                       medicine_count, updated_at, finalized_at) -> None:
    payload = { "patient_id": ..., "prescription_id": ..., "medicine_count": ... }
    get_pharmacy_gateway().upsert_queue_projection(tenant_id, visit_id, payload)
```

The pharmacy **queue is a projection**: pharmacy stores a denormalised copy (patient name, UHID, phone, doctor name, medicine_count, formatted_visit_id) so the dispense screen never has to call OPD to render a work-list. OPD keeps it current by pushing on every prescription lifecycle change.

<!-- chapter: The dispense lifecycle -->

The most instructive state machine on the journey is the pharmacy side, because it shows the projection and the dispense record moving in lock-step. `dispense_status` on the queue starts `pending`; the terminal state records whether the prescribed quantity was fully met.

```diagram title="Pharmacy queue → dispense status"
stateDiagram-v2
  [*] --> pending: OPD pushes queue projection (Rx finalized)
  pending --> issued: dispense, all prescribed qty met
  pending --> partial_issue: dispense, some qty short or missing
  partial_issue --> issued: top-up dispense meets qty
  issued --> [*]
  partial_issue --> [*]
```

For context, the **visit** itself carries a simpler enum in the registration schema (`pending → in_progress → completed`, or `cancelled`), while OPD **derives** a richer UI status by combining the visit row with the prescription status (`registered / pre_consulted / in_progress / completed`) in `data_access/visit_status.py`. Two modules, two views of "where is this patient" — reconciled at read time, not stored once.

<!-- chapter: Who stores what -->

Key entities per module — illustrative, not every column. Note every table carries `iq_tenant_id` (Citus distribution key) and cross-module links are **soft UUIDs, never FKs**.

```data-model title="One row per module for a single OPD visit"
. registration.visit — the intake row (ADR-0029)
.   iq_tenant_id uuid PK
.   id uuid PK — encounter UUID used in API routes
.   visit_id text — formatted OP visit number, e.g. VIS-ABC12345
.   patient_id uuid — soft ref to empi
.   status varchar — pending / in_progress / completed / cancelled
.   doctor_id uuid
. opd.prescriptions — the clinical encounter (Python)
.   id uuid PK
.   visit_id uuid — soft ref to registration.visit.id
.   patient_id uuid
.   doctor_id uuid
.   status enum — draft / final / cancelled
.   vitals + diagnoses + medicines — child tables (aggregate)
. billing.bills — the OP bill
.   id uuid PK
.   bill_number text
.   patient_id uuid
.   visit_id uuid — soft ref
.   status text — DRAFT / FINALIZED / PARTIALLY_PAID / PAID
.   net_amount numeric
.   paid_amount numeric
. pharmacy.queue_projection — denormalised dispense work-list
.   queue_item_id uuid PK
.   source_ref_id uuid — the OPD visit
.   prescription_id uuid
.   medicine_count int
.   dispense_status text — pending / issued / partial_issue
. pharmacy.dispense — the dispense record (1 per visit)
.   id uuid PK
.   visit_id uuid — unique per tenant
.   opd_prescription_id uuid
.   dispense_status text — issued / partial_issue
. inventory.stock — batches by store (NOT decremented on dispense yet)
.   item + lot + store — FEFO deduction exists, used only for transfers
registration.visit ||--o| opd.prescriptions : soft visit_id
registration.visit ||--o{ billing.bills : soft visit_id
opd.prescriptions ||--|| pharmacy.queue_projection : pushed on finalize
pharmacy.queue_projection ||--o| pharmacy.dispense : dispensed against
```

```callout tone=risk title="The inventory gap is real"
Pharmacy dispense line-items carry a `stock_batch_id` column (a soft reference to an inventory batch), but **nothing decrements inventory stock when a medicine is dispensed**. `inventory` has a FEFO deduction helper (`lib/deduct-stock-fefo.ts`) — verified used *only* by inter-store stock transfers (`data-access/transfer.repo.ts`), never by pharmacy. There is no pharmacy→inventory gateway anywhere in the tree. So in Phase 1 the OPD journey ends at "dispense recorded"; stock reconciliation against dispensing is not yet wired. Treat any diagram that draws a pharmacy→inventory arrow as aspirational.
```
