# IPD Lite — User Stories with Branching

## Phase 0: Admission Intake

### US-01: Dashboard overview
**Actor:** Frontdesk / Doctor / Nurse / Owner  
**Entry:** User lands on `/ipd`  
**What they see:** Occupancy today, admissions today, discharges today, available beds, collection/clearance indicators  
**Branches:** — (read-only view, no branching)  
**Dependencies:** Admission, bed, billing data

### US-02: Patient arrives for admission
**Actor:** Frontdesk  
**Entry:** User at Admission Queue (`/ipd/admissions`) or clicks "New Admission"

**Branch A — Already registered in system (has UHID)**
1. Search patient by UHID / name / phone
2. Select from search results
3. Patient context bar shows: name, UHID, age/gender
4. Proceed to admission form

**Branch B — Walk-in (not registered)**
1. Brief registration form inline (name, phone, age, gender, address)
2. OR redirect to frontdesk registration module
3. Return with new UHID
4. Proceed to admission form

**Branch C — OPD admission advice (has visit)**
1. Visit context pre-filled from OPD visit
2. Source auto-set to `opd`
3. Provisional diagnosis pre-filled from OPD advice
4. Proceed to admission form

**Branch D — Emergency referral**
1. Source auto-set to `emergency`
2. Priority defaulted to urgent
3. Proceed to admission form

---

### US-03: Fill admission details
**Actor:** Frontdesk  
**From:** Any branch of US-02

**Form fields:**
- Admission type: `planned` / `emergency` / `direct` / `daycare` / `transfer_in`
- Admission source: `opd` / `emergency` / `referral` / `walk_in`
- Provisional diagnosis
- Attending consultant (search from master data)
- Financial class: `general` / `private` / `insurance` / `sponsored`
- Expected LOS (days)
- Deposit amount (optional, zero allowed)

**Branch A — Daycare selected**
- Bed/chair terminology switches
- Default shorter LOS (configurable)
- Discharge flow simplified (skip `discharge_planning`)

**Branch B — Insurance/sponsored selected**
- Additional fields: insurance details, sponsor ID, TPA approval
- (deferred: displays in billing status but not validated by IPD)

---

### US-04: Allocate bed/chair
**Actor:** Frontdesk  
**From:** US-03 form submission (or separate step)

**Branch A — Bed selected on form**
1. Bed board shows available beds filtered by ward/gender/type
2. User selects bed/chair
3. Bed status changes to `reserved`, then `occupied` on confirmation

**Branch B — No bed selected on form**
1. Episode created as `scheduled` without bed
2. Bed remains unassigned
3. Patient appears in "Unallocated" filter on Bed Board
4. Bed must be assigned before status transitions to `admitted`

**Branch C — Bed not available**
1. Show "No beds available" warning
2. Option to join waiting list (deferred)
3. Episode stays `scheduled` — manual check later

---

### US-05: Collect deposit
**Actor:** Frontdesk  
**From:** US-03/US-04

**Branch A — Deposit collected (including zero)**
1. Deposit amount recorded on episode (`deposit_amount`)
2. Charge sent to billing module via API
3. Billing returns confirmation reference

**Branch B — Deposit deferred / billing module down**
1. Episode created with `deposit_amount = 0`
2. Warning badge on episode: "Deposit pending"
3. Not blocking — admission proceeds

---

### US-06: Confirm admission
**Actor:** Frontdesk  
**From:** US-03 + US-04 + US-05

**Effect:**
- Episode status: `scheduled` → `admitted`
- Bed status: `reserved` → `occupied` (if bed was selected)
- `admitted_at` timestamp set
- Event published: `episode.admitted`
- Patient appears on: Bed Board (occupied), Census, clinical surfaces

---

## Phase 1: Bed Board & Census

### US-07: View bed board
**Actor:** Frontdesk / Nurse  
**Route:** `/ipd/beds`

**What they see:** Ward grid with bed status colours
- 🟢 Available — green
- 🟡 Reserved — yellow
- 🔴 Occupied — red
- 🟤 Cleaning pending — brown
- ⚫ Maintenance blocked — grey

**Actions per bed:**
- Click occupied bed → view episode summary (navigate)
- Click available bed → "Allocate" from board (quick admit)
- Click cleaning → mark as available (housekeeping)

**Filters:** By ward, by status, by bed type

---

### US-08: View patient census
**Actor:** Doctor / Nurse  
**Route:** `/ipd/patients`

**What they see:** List of active in-house patients (status = `admitted` or `discharge_planning` or `pending_clearance`)

**Columns:** Bed, patient name, UHID, admission date, LOS (days), consultant, diagnosis

**Filters:** By ward, by consultant, by status, text search

**Action:** Click → Episode summary

---

## Phase 2: Clinical Stay — Episode Shell

**Every episode has sub-screens:** Summary, Notes, Vitals, Orders, Medications, Billing, Discharge  
**Patient context bar always visible:** name, UHID, bed, admission number

### US-09: View episode summary
**Actor:** Doctor / Nurse  
**Route:** `/ipd/episodes/:id`

**What they see:** Tab navigation + landing summary card
- Patient identity + admission info
- Current bed/ward, LOS
- Consultant, diagnosis
- Recent vital signs (summary widget)
- Recent notes (list)
- Active orders (list)
- Discharge status (if applicable)

---

### US-10: Write clinical note
**Actor:** Doctor / Nurse  
**Route:** `/ipd/episodes/:episodeId/notes/new`

**Branch A — Admission note**
- Template: History, Examination, Diagnosis, Plan (SOAP)
- `note_type: admission_note`

**Branch B — Progress note**
- Template: Subjective, Objective, Assessment, Plan (SOAP)
- `note_type: progress_note`

**Branch C — Nursing note**
- Template: Vital signs summary, observations, care given
- `note_type: nursing_note`

**Note state machine:** `draft → [edit] → finalized → signed`
- Draft: only author can edit
- Finalized: read-only, pending signature
- Signed: read-only, signed by doctor (may differ from author)

---

### US-11: Record vitals
**Actor:** Nurse / Doctor  
**Route:** `/ipd/episodes/:episodeId/vitals`

**Workflow:**
1. Start new check-in (time-bound round)
2. Record multiple parameters: BP (systolic/diastolic), pulse, temp, SpO2, RR, blood sugar, pain score, etc.
3. Each parameter → one row in `vital_signs` with `vital_code`, unit, value
4. All rows share same `check_in_id`

**Branch A — Tabular view:** Table of check-ins × parameters (latest first)
**Branch B — Trend view:** Line chart for a selected parameter over time (deferred to post-V1)

**Validation:** Abnormal values flagged against master-data normal ranges (configurable)

---

### US-12: Place an order
**Actor:** Doctor / Nurse  
**Route:** `/ipd/episodes/:episodeId/orders/new`

**Branch by category:**
| Category | Example | Fulfilled by |
|---|---|---|
| investigation | CBC, X-ray, MRI | Lab/radiology (external) |
| procedure | Dressing, catheterization | IPD (nurse/doctor) |
| medication | Tablet Paracetamol 500mg | Pharmacy |
| consumable | Syringe, gloves | Store |
| nursing_service | Bed bath, position change | Nurse |
| diet | Diabetic diet, soft diet | Deferred (no dietary queue) |
| consult | Cardiology refer | Consults (deferred) |

**Order state machine:** `placed → acknowledged → in_progress → completed → cancelled`
- `placed`: initial state, not yet actioned
- `acknowledged`: pharmacy/lab acknowledges receipt
- `in_progress`: fulfilment started
- `completed`: fulfilled, results/nursing action done
- `cancelled`: with reason

**Branch A — Medication order (pharmacy):**
- Requires: drug name, dose, route, frequency, duration
- Published as event: `order.placed` → pharmacy module
- Pharmacy dispenses → event: `pharmacy.dispensed` → order becomes `in_progress`
- Pharmacy billing → charge posted to `ipd_charges`

**Branch B — Investigation order (lab/radiology):**
- Requires: investigation name, priority (routine/urgent/stat)
- Published as event → LIS/RIS (external integration)
- Results received → order becomes `completed` (deferred)

**Branch C — Procedure/consumable/nursing (internal):**
- Nurse acknowledges → `in_progress`
- Completed on documentation → `completed`
- Auto-charges posted to `ipd_charges`

---

### US-13: View order tracker
**Actor:** Doctor / Nurse / Pharmacy  
**Route:** `/ipd/episodes/:episodeId/orders`

**What they see:** All orders for episode, grouped by status/category

**Actions:**
- View order details
- Cancel order (with reason, only if `placed` or `acknowledged`)
- (Pharmacy) Acknowledge / mark in-progress / complete

---

### US-14: Record medication administration (eMAR)
**Actor:** Nurse  
**Route:** `/ipd/episodes/:episodeId/emar`

**Workflow:**
1. See medication schedule grid: time slots (6AM, 8AM, 12PM, 6PM, 10PM) × active medications
2. For each scheduled dose:
   - **Branch A — Administered:** Record time, dose given, route. Status → `administered`
   - **Branch B — Held:** Record hold reason (e.g., NBM, patient refused). Status → `held`
   - **Branch C — Missed:** Auto-marked if not recorded within window. Status → `missed`
   - **Branch D — PRN:** Record PRN administration with indication. Status → `administered`

---

### US-15: Manage nursing tasks
**Actor:** Nurse  
**Route:** `/ipd/workbench/nursing/tasks` (deferred to post-V1; accessible through episode in V1)

**Workflow:**
1. View pending tasks for shift (morning/evening/night)
2. Filter by ward, priority
3. Complete task → record who completed, when

**Task sources:**
- Scheduled vitals checks (auto-generated from order frequency)
- Medication rounds (from eMAR schedule)
- Orders requiring nursing action
- Manual task creation

**State:** `pending → in_progress → completed`
**Carry-forward:** Uncompleted tasks can be carried to next shift (`carried_forward`)

---

## Phase 3: Transfers

### US-16: Transfer patient between beds/wards
**Actor:** Doctor / Nurse / Frontdesk  
**Route:** `/ipd/transfers`

**Workflow:**
1. Select patient (current ward/bed pre-filled)
2. Select destination ward/bed
3. Enter reason, clinical condition
4. Submit

**State machine:** `requested → approved → completed → cancelled`

**Branch A — Intra-ward transfer (same ward, different bed)**
- Simplified: no billing change
- Bed swap: old bed → `cleaning_pending`, new bed → `occupied`

**Branch B — Inter-ward transfer (different ward)**
- May trigger billing impact: bed charge rate may change
- Episode's `ward_id` and `bed_id` updated

**Branch C — Transfer declined / cancelled**
- Original bed remains occupied
- Cancellation reason recorded

---

## Phase 4: Discharge

### US-17: View discharge readiness board
**Actor:** Doctor / Billing / Nurse  
**Route:** `/ipd/discharge`

**What they see:** Patients in `discharge_planning` or `pending_clearance` status

**Columns:** Patient, bed, LOS, discharge type, clearance status (medical/billing/pharmacy/nursing)

**Action:** Click → Discharge planner for that episode

---

### US-18: Initiate discharge
**Actor:** Doctor  
**Route:** From discharge board or episode → Discharge tab

**Effect:**
- Episode status: `admitted` → `discharge_planning`
- Discharge plan created (`discharge_plans`): status = `planning`
- Discharge type selected (default: `normal`)
- Doctor fills: discharge notes, follow-up plan

**Branch A — Discharge type: normal (routine)**
1. Proceed through standard clearance workflow
2. Discharge summary → sign → final discharge

**Branch B — Discharge type: LAMA / DAMA**
1. Legal form with witness signature (UI placeholder)
2. Record reason
3. Skip clearance checks (billing may still enforce)
4. Episode closure_type: `lama` or `dama`

**Branch C — Discharge type: abscond**
1. Record when patient found missing
2. Document last known location/time
3. Episode closure_type: `abscond`
4. Billing settlement still required

**Branch D — Discharge type: death**
1. Record time of death
2. Cause of death (provisional / final)
3. External: notify death registration (fire-and-forget)
4. Mortuary handoff (fire-and-forget, deferred)
5. Episode closure_type: `death`

---

### US-19: Complete discharge clearances
**Actor:** Doctor / Billing / Nurse / Pharmacy  
**From:** US-18, branch A

**Workflow:** Episodes in `discharge_planning` transition through clearances

**Clearance types (JSONB on discharge_plans):**
- Medical clearance — Doctor confirms clinical readiness
- Billing clearance — Billing confirms no outstanding/pending charges
- Pharmacy clearance — Pharmacy confirms no outstanding medications
- Nursing clearance — Nurse confirms all nursing tasks complete, records handed over

**Branch A — All clearances obtained**
- Episode status: `discharge_planning` → `pending_clearance` → (auto-final) → `ready`
- Proceed to US-20

**Branch B — Clearance rejected**
- Specific clearance marked as rejected with reason
- Episode stays in `discharge_planning`
- Notified back to requesting department

**Branch C — Clearance waived**
- Configurable per clearance type
- Still recorded but flagged as waived

---

### US-20: Write and sign discharge summary
**Actor:** Doctor  
**From:** US-19, all clearances obtained

**Summary content (JSONB):**
- Admission details: date, source, diagnosis at admission
- Course in hospital: summary of stay, procedures, significant events
- Diagnosis at discharge
- Investigations: key findings
- Procedures performed
- Medications at discharge (with instructions)
- Follow-up plan
- Advice to patient

**State machine:** `draft → signed`
- Draft: doctor can edit
- Signed: read-only, `signed_at` + `signed_by` recorded
- ABDM linkage: if enabled, summary pushed to ABDM (deferred)

---

### US-21: Execute final discharge
**Actor:** Doctor / Frontdesk  
**From:** US-20 (summary signed) + US-19 (all clearances)

**Effect of final discharge (transactional):**
1. Episode status: → `discharged`
2. `discharged_at` timestamp set
3. Bed status: `occupied` → `cleaning_pending`
4. Cleaning task created in housekeeping queue (ipd_charges if bed charge applicable)
5. Final charges posted to `ipd_charges` (outstanding balance, if any)
6. Event published: `episode.discharged`
7. Bed board updates immediately

---

## Phase 5: Billing

### US-22: View episode billing panel
**Actor:** Billing / Doctor (view only) / Nurse (view only)  
**Route:** `/ipd/episodes/:episodeId/billing`

**What they see:**
- Running summary: total charges, deposit, balance due
- Charge items grouped by type: bed, consultation, procedure, medicine, consumable, manual
- Payment/deposit history (read-only from billing module)

---

### US-23: Auto-posted charges
**Actor:** System (cron / event-driven)

**Bed charges:**
- Daily rate based on bed type/ward
- Auto-posted at midnight for each active day

**Order completion charges:**
- When order status → `completed`, charge is calculated from tariff
- Posted to `ipd_charges` with source = `order_id`
- Status: `pending` → pushed to billing module

---

### US-24: Manual charge capture
**Actor:** Nurse / Doctor / Billing  
**From:** Episode billing panel

1. Select charge type: `manual`
2. Enter: description, quantity, unit price
3. Net amount calculated
4. Posted to `ipd_charges`, status: `pending`

---

### US-25: Billing settlement at discharge
**Actor:** Billing  
**From:** US-21 (before or after final discharge, depending on clearance)

**Workflow:**
1. All pending charges pushed to billing module
2. Billing module handles: deposit application, insurance claim, balance payment
3. Billing confirms settlement → event: `billing.settled`
4. IPD records: `ipd_charges.status → billed` with `billing_ref`
5. Billing clearance in discharge plan marked as cleared

---

## Phase 6: Reports (deferred to post-V1)

### US-26: View reports
**Actor:** Owner / Manager  
**Route:** `/ipd/reports` (deferred)

**Report types:**
- Admission/Discharge register (date range)
- Daily/monthly occupancy
- Collection summary (by period)
- Diagnosis-wise / Consultant-wise summary

---

## Cross-Cutting: Episode States Summary

```
                    ┌──────────┐
                    │scheduled │  ← Created, not yet admitted
                    └────┬─────┘
                         │ Bed assigned + confirmed
                         ▼
                    ┌──────────┐
                    │ admitted │  ← Clinical stay active
                    └────┬─────┘
                         │
              ┌──────────┼──────────┬──────────────┐
              ▼          ▼          ▼              ▼
        ┌─────────┐ ┌────────┐ ┌───────────┐ ┌──────────┐
        │discharge│ │transfer│ │lama/dama/ │ │ death    │
        │planning │ │(still  │ │abscond    │ │(external)│
        └────┬────┘ │admitted)│ └─────┬─────┘ └────┬─────┘
             ▼       └────────┘       │             │
        ┌──────────┐                  │             │
        │pending   │                  │             │
        │clearance │                  │             │
        └────┬─────┘                  │             │
             ▼                        ▼             ▼
        ┌──────────┐           ┌──────────┐  ┌──────────┐
        │discharged│           │discharged│  │discharged│
        │(normal)  │           │(closure: │  │(closure: │
        └──────────┘           │lama/dama/│  │death)    │
                               │abscond)  │  └──────────┘
                               └──────────┘
```

## Decision Tree: One Complete Journey

```
Patient arrives
    │
    ├─ Has UHID? ──yes──► Search & select
    │                        │
    └─ No UHID? ────no───► Quick registration
                             │
                             ▼
                    Admission form:
                    type (planned/emergency/...)
                    source (OPD/walk-in/...)
                    diagnosis, consultant, financial class
                    deposit (optional)
                    expected LOS
                        │
                        ▼
                    Bed allocation:
                    ├─ Available?──yes──► Select bed/chair
                    └─ Not avail?───no──► Scheduled without bed
                        │
                        ▼
                    Confirm → status: admitted
                        │
                        ▼
                    ┌──────────────────────┐
                    │    CLINICAL STAY      │
                    │  Notes, Vitals,       │
                    │  Orders, eMAR, Tasks, │
                    │  Transfers            │
                    └──────────┬───────────┘
                               │
                    Discharge initiated
                        │
                    ├─ normal ──────► Clearances (medical, billing,
                    │                   pharmacy, nursing)
                    │                   │
                    │                   ├─ All cleared? ──► Summary draft
                    │                   │                      │
                    │                   │                  Sign summary
                    │                   │                      │
                    │                   │              Final discharge
                    │                   │                  status: discharged
                    │                   │                  closure: normal
                    │                   │
                    │                   └─ Rejected? ──► Resolve & retry
                    │
                    ├─ LAMA/DAMA ───► Legal form, reason
                    │                      │
                    │                  Final discharge
                    │                  closure: lama/dama
                    │
                    ├─ abscond ──────► Document missing
                    │                      │
                    │                  Final discharge
                    │                  closure: abscond
                    │
                    └─ death ────────► Cause of death
                                           │
                                       Death notification
                                       (external)
                                           │
                                       Final discharge
                                       closure: death
```

---

Legend:
- **Normal flow** (most common): solid lines
- **Exception flow** (LAMA/DAMA/abscond/death): dotted lines
- **Deferred** (post-V1): italic
