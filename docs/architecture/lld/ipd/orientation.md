# IPD Lite — Module Orientation

**Status:** V1 design  
**Source reference:** [`himsPlatform`](https://github.com/sheivin/himsPlatform) `services/ipd/` + `services/adt/` (patterns distilled for Lite)  
**Product handoff:** `scratch/HIMS_Lite_IPD_Engineering_Handoff.md`  
**Code:** `modules/ipd/` · **Schema:** `ipd`

---

## Phase 0 scaffold vs LLD (`01-schema-design.md`)

Phase 0 ships **`ipd.wards`**, **`ipd.beds`**, and **`ipd.episodes`** with column names and enums aligned to the LLD. Nine clinical tables (`clinical_notes`, `vital_signs`, etc.) are deferred to Phase 1.

| Topic | Phase 0 | LLD target |
|---|---|---|
| Table inventory | `wards`, `beds`, `episodes` | Same three + nine clinical tables |
| Episode columns | LLD-aligned (`id`, `episode_number`, `visit_id`, `ward_id`, `bed_id`, …) | `01-schema-design.md` §3 |
| Patient denorm | `patient_name` only | Same |
| REST paths | `/admissions` (product term; row is an episode) | Same intake workflow |

Ward/bed CRUD APIs and bed status machine handlers are Phase 1 — schema exists for FK targets on episodes.

---

## What this module does

IPD Lite covers the inpatient/day-care lifecycle for small clinics and nursing homes: admission, bed allocation, clinical charting (notes, vitals, orders, medications), nursing tasks, transfers, discharge, and running-charge capture.

**Facility management (wards, beds) is embedded here** — no separate ADT service. For a small facility the extra HTTP hop is unnecessary complexity.

### Not in V1

| Excluded | Reason |
|---|---|
| AI note draft, discharge prediction, missed charges, risk queue | Enterprise upsell |
| Research exports, break-glass logs, KPI catalog | Governance-heavy |
| Infection control dashboard, MRD completion | Specialized ops |
| OT movements, transport queue, capacity forecast | Ops-heavy, integration-dependent |
| Advanced SLA, notification, sponsor, RBAC config | Creates implementation burden |
| Full pharmacy stock management | Out of scope per product |

---

## End-to-end workflow

```
Registration ──► Admission ──► Bed Allocation ──► Clinical Stay ──► Discharge
                        │                            │
                   Episode created               Notes, vitals,
                   Deposit (billing)              orders, meds,
                   Bed assigned                   nursing tasks,
                                                  transfers
```

### Steps

1. **Admission intake** — Frontdesk selects existing patient (from `registration`), chooses admission source (OPD/ER/direct/daycare), fills provisional diagnosis, consultant, financial class. Collects deposit via `billing` module. Allocates a bed/chair.

2. **Bed board & census** — Ward view of beds with status colours (available/reserved/occupied/cleaning). Active inpatient list for doctors and nurses.

3. **Clinical workbench** — Doctor/nurse works from a patient list. Each episode has tabs: Summary, Notes, Vitals, Orders, Medications, Billing, Discharge.

4. **Clinical notes** — Admission notes, progress notes, nursing notes. Draft → finalize → sign.

5. **Vitals** — Time-series recording (BP, pulse, temp, SpO2, RR, blood sugar). Tabular + trend views.

6. **Orders** — Investigations, procedures, medications, consumables, nursing services. Status: placed → acknowledged → in-progress → completed/cancelled. Routes fulfilment to billing and pharmacy via their modules.

7. **eMAR** — Medication administration grid (time × drugs). Nurse records administration, hold, or PRN. Pharmacy handles dispense.

8. **Nursing tasks** — Shift-based task tracking: vitals due, medication rounds, care tasks.

9. **Transfers** — Bed/ward change with billing impact. Request → approve → complete.

10. **Discharge** — Single journey: medical clearance → billing clearance → pharmacy pending → discharge summary → final discharge. Vacates bed, posts final charges, closes episode.

11. **Billing** — Running IPD bill panel. Bed charges, consultation, procedures, medicines, consumables. Integrates with `billing` for tariff + payment.

12. **Reports** — Admission/discharge register, occupancy, collection.

### Dependencies

| Dependency | Why |
|---|---|
| `registration` | Patient identity, visit context |
| `billing` | Tariff, deposit/charge capture, payment |
| `pharmacy` | Medicine dispense |
| `master-data` | Departments, doctors, services catalogue |
| ABDM adapter | Discharge summary linking (optional V1) |

---

## Module layout

```
modules/ipd/src/
  ports.ts                         # Repository interfaces
  domain/
    episode.types.ts
    clinical-note.types.ts
    vital-signs.types.ts
    inpatient-order.types.ts
    medication-administration.types.ts
    nursing-task.types.ts
    transfer-request.types.ts
    discharge-plan.types.ts
    discharge-summary.types.ts
    ipd-charge.types.ts
  schema/
    tables.ts                      # Drizzle: all 13 tables
    apply-migration.ts
  data-access/
    episode.repo.ts
    clinical-note.repo.ts
    ...
  use-cases/
    create-admission.ts
    discharge-patient.ts
    record-vitals.ts
    place-order.ts
    ...
  rest-handlers/
    admission.handlers.ts
    bed.handlers.ts
    clinical-note.handlers.ts
    ...
  http-handlers/
    capture-charge.handler.ts       # Calls billing module
  events/
    publishers/
      episode-admitted.ts
      discharge-completed.ts
    consumers/
      billing-charge-confirmed.ts
      pharmacy-dispensed.ts
  router.ts
  index.ts
```
