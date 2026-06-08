# IPD Lite — Schema Design

**Schema name:** `ipd`  
**Distribution:** All tables Citus-distributed on `iq_tenant_id`  
**Convention:** Composite PK `(iq_tenant_id, id)`, `tenantColumn()`, `auditColumns()` from `@hims/ts-sdk-db`

**ERD:** [`ipd-lite.erd.json`](./ipd-lite.erd.json) (open in VS Code with ERD editor)

---

## Table inventory

| # | Table | Purpose |
|---|---|---|
| 1 | `wards` | Clinical areas (ward, daycare, etc.) |
| 2 | `beds` | Individual beds/chairs with status |
| 3 | `episodes` | Core admission/encounter record |
| 4 | `clinical_notes` | Doctor/nurse documentation |
| 5 | `vital_signs` | Time-series vitals |
| 6 | `inpatient_orders` | All order types |
| 7 | `medication_administrations` | eMAR records |
| 8 | `nursing_tasks` | Shift-based task tracking |
| 9 | `transfer_requests` | Bed/ward moves |
| 10 | `discharge_plans` | Discharge checklist & planning |
| 11 | `discharge_summaries` | Final structured summary |
| 12 | `ipd_charges` | Running charge items |

---

## 1. `wards` — Clinical areas

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid PK` | `gen_random_uuid()` |
| `iq_tenant_id` | `uuid NOT NULL` | |
| `ward_name` | `text NOT NULL` | e.g. "General Ward A" |
| `ward_code` | `text NOT NULL` | Unique short code |
| `ward_type` | `text NOT NULL` | `general`, `semi_private`, `private`, `daycare`, `icu` |
| `floor` | `text` | |
| `specialty` | `text` | |
| `gender_restriction` | `text NOT NULL DEFAULT 'any'` | `male`, `female`, `any`, `pediatric` |
| `is_active` | `boolean NOT NULL DEFAULT true` | |
| `...auditColumns()` | | |

```
UNIQUE (iq_tenant_id, ward_code)
INDEX (iq_tenant_id, ward_type)
```

---

## 2. `beds` — Individual beds/chairs

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid PK` | |
| `iq_tenant_id` | `uuid NOT NULL` | |
| `ward_id` | `uuid NOT NULL` | FK (soft) to ipd.wards |
| `room_number` | `text` | |
| `bed_number` | `text NOT NULL` | |
| `bed_code` | `text NOT NULL` | `ward_code + bed_number` |
| `bed_type` | `text NOT NULL DEFAULT 'general'` | `general`, `isolation`, `private`, `deluxe`, `daycare` |
| `bed_status` | `text NOT NULL DEFAULT 'available'` | `available`, `reserved`, `occupied`, `cleaning_pending`, `maintenance_blocked` |
| `current_patient_id` | `uuid` | Set when occupied |
| `current_episode_id` | `uuid` | |
| `reserved_for_episode_id` | `uuid` | |
| `reserved_until` | `timestamptz` | |
| `is_active` | `boolean NOT NULL DEFAULT true` | |
| `...auditColumns()` | | |

```
UNIQUE (iq_tenant_id, bed_code)
INDEX (iq_tenant_id, ward_id, bed_status)
```

**Status machine:**

```
available ↔ reserved → occupied → cleaning_pending → available
available → maintenance_blocked → available
```

---

## 3. `episodes` — Core admission record

Links to `registration.visit` via `visit_id`. Carries denormalised patient name for fast display — all other patient identity fields live in `registration`.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid PK` | |
| `iq_tenant_id` | `uuid NOT NULL` | |
| `episode_number` | `text NOT NULL` | `IPD-YYYYMMDD-XXXX` |
| `visit_id` | `uuid` | FK (soft) to registration.visit |
| `patient_id` | `uuid NOT NULL` | |
| `patient_name` | `text NOT NULL` | Denormalised for fast display on clinical surfaces |
| `admission_type` | `text NOT NULL` | `planned`, `emergency`, `direct`, `transfer_in`, `daycare` |
| `admission_source` | `text NOT NULL` | `opd`, `emergency`, `referral`, `walk_in` |
| `status` | `text NOT NULL DEFAULT 'scheduled'` | See state machine below |
| `ward_id` | `uuid` | Current ward |
| `bed_id` | `uuid` | Current bed |
| `specialty_id` | `uuid` | |
| `attending_consultant_id` | `uuid` | Consultant responsible for this episode |
| `provisional_diagnosis` | `text` | |
| `financial_class` | `text NOT NULL DEFAULT 'general'` | `general`, `private`, `insurance`, `sponsored` |
| `deposit_amount` | `numeric(18,4)` | |
| `expected_los_days` | `int` | |
| `admitted_at` | `timestamptz` | |
| `discharged_at` | `timestamptz` | |
| `closure_type` | `text` | `normal`, `lama`, `dama`, `abscond`, `death` |
| `closure_reason` | `text` | |
| `idempotency_key` | `text` | |
| `...auditColumns()` | | |

```
UNIQUE (iq_tenant_id, episode_number)
UNIQUE (iq_tenant_id, idempotency_key) WHERE idempotency_key IS NOT NULL
INDEX (iq_tenant_id, status)
INDEX (iq_tenant_id, patient_id)
INDEX (iq_tenant_id, ward_id, status)
INDEX (iq_tenant_id, visit_id)
```

**State machine (6 states, simplified for Lite):**

```
scheduled → admitted → discharge_planning → pending_clearance → discharged
                ↓
     [cancelled, lama, dama, abscond, death]   (from any active state)
```

---

## 4. `clinical_notes` — Doctor/nurse documentation

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid PK` | |
| `iq_tenant_id` | `uuid NOT NULL` | |
| `episode_id` | `uuid NOT NULL` | |
| `note_type` | `text NOT NULL` | `admission_note`, `progress_note`, `nursing_note` |
| `author_id` | `uuid NOT NULL` | |
| `author_role` | `text NOT NULL` | `doctor`, `nurse` |
| `content` | `jsonb NOT NULL DEFAULT '{}'` | SOAP sections |
| `status` | `text NOT NULL DEFAULT 'draft'` | `draft`, `finalized`, `signed` |
| `signed_at` | `timestamptz` | |
| `signed_by` | `uuid` | |
| `...auditColumns()` | | |

```
INDEX (iq_tenant_id, episode_id)
INDEX (iq_tenant_id, author_id, status)
```

---

## 5. `vital_signs` — Parameterized vital observations

Parameterized (tall/EAV) table. Each bedside round writes N rows sharing a `check_in_id` — one per vital parameter. `vital_code` bridges to `master-data.visitpad.vitals` for unit labels, normal range colouring, and threshold alerts in the UI.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid PK` | |
| `iq_tenant_id` | `uuid NOT NULL` | |
| `episode_id` | `uuid NOT NULL` | |
| `check_in_id` | `uuid NOT NULL` | Groups readings from one nurse round |
| `recorded_at` | `timestamptz NOT NULL` | |
| `vital_code` | `text NOT NULL` | References `master-data.visitpad.vitals.code` |
| `vital_name` | `text NOT NULL` | Denormalised for fast display |
| `data_type` | `text NOT NULL` | `numeric`, `text`, `boolean`, `score` |
| `value_numeric` | `numeric` | Populated when `data_type` = numeric |
| `value_text` | `text` | Populated when `data_type` = text/boolean |
| `unit` | `text` | Denormalised from master-data |
| `recorded_by` | `uuid NOT NULL` | |
| `notes` | `text` | |
| `...auditColumns()` | | |

```
INDEX (iq_tenant_id, episode_id, check_in_id)
INDEX (iq_tenant_id, episode_id, recorded_at DESC)
INDEX (iq_tenant_id, check_in_id)
```

---

## 6. `inpatient_orders` — All order types

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid PK` | |
| `iq_tenant_id` | `uuid NOT NULL` | |
| `episode_id` | `uuid NOT NULL` | |
| `order_number` | `text NOT NULL` | Formatted sequence |
| `order_category` | `text NOT NULL` | `investigation`, `procedure`, `medication`, `consumable`, `nursing_service`, `diet`, `consult` |
| `item_code` | `text NOT NULL` | From master data / tariff |
| `item_name` | `text NOT NULL` | Denormalised |
| `quantity` | `numeric(10,2) NOT NULL DEFAULT 1` | |
| `dosage_instruction` | `text` | For medications |
| `frequency` | `text` | `STAT`, `OD`, `BD`, `TID`, `QID`, `Q4H`, `Q6H`, `Q8H`, `PRN` |
| `duration_days` | `int` | |
| `priority` | `text NOT NULL DEFAULT 'routine'` | `routine`, `urgent`, `stat` |
| `status` | `text NOT NULL DEFAULT 'placed'` | `placed`, `acknowledged`, `in_progress`, `completed`, `cancelled`, `on_hold` |
| `completed_at` | `timestamptz` | |
| `cancelled_reason` | `text` | |
| `billing_status` | `text NOT NULL DEFAULT 'pending'` | `pending`, `billed`, `waived` |
| `notes` | `text` | |
| `idempotency_key` | `text` | |
| `...auditColumns()` | | |

```
UNIQUE (iq_tenant_id, order_number)
UNIQUE (iq_tenant_id, idempotency_key) WHERE idempotency_key IS NOT NULL
INDEX (iq_tenant_id, episode_id, status)
INDEX (iq_tenant_id, order_category, status)
```

---

## 7. `medication_administrations` — eMAR records

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid PK` | |
| `iq_tenant_id` | `uuid NOT NULL` | |
| `order_id` | `uuid NOT NULL` | FK (soft) to ipd.inpatient_orders |
| `episode_id` | `uuid NOT NULL` | |
| `scheduled_time` | `timestamptz NOT NULL` | |
| `administered_time` | `timestamptz` | |
| `status` | `text NOT NULL DEFAULT 'scheduled'` | `scheduled`, `administered`, `held`, `missed`, `refused` |
| `dose_given` | `text` | e.g. "1 tablet" |
| `route` | `text` | `oral`, `iv`, `im`, `sc`, `topical`, `inhalation` |
| `administered_by` | `uuid` | |
| `hold_reason` | `text` | |
| `notes` | `text` | |
| `...auditColumns()` | | |

```
INDEX (iq_tenant_id, episode_id, scheduled_time)
INDEX (iq_tenant_id, order_id)
```

---

## 8. `nursing_tasks` — Shift-based task tracking

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid PK` | |
| `iq_tenant_id` | `uuid NOT NULL` | |
| `episode_id` | `uuid NOT NULL` | |
| `ward_id` | `uuid NOT NULL` | |
| `task_type` | `text NOT NULL` | `vitals_due`, `medication_due`, `dressing`, `care_round`, `checklist` |
| `description` | `text NOT NULL` | |
| `due_time` | `timestamptz` | |
| `assigned_to` | `uuid` | |
| `status` | `text NOT NULL DEFAULT 'pending'` | `pending`, `in_progress`, `completed`, `carried_forward` |
| `completed_at` | `timestamptz` | |
| `completed_by` | `uuid` | |
| `shift` | `text` | `morning`, `evening`, `night` |
| `...auditColumns()` | | |

```
INDEX (iq_tenant_id, ward_id, shift, status)
INDEX (iq_tenant_id, episode_id)
```

---

## 9. `transfer_requests` — Bed/ward moves

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid PK` | |
| `iq_tenant_id` | `uuid NOT NULL` | |
| `episode_id` | `uuid NOT NULL` | |
| `from_ward_id` | `uuid NOT NULL` | |
| `from_bed_id` | `uuid NOT NULL` | |
| `to_ward_id` | `uuid NOT NULL` | |
| `to_bed_id` | `uuid` | Set on completion |
| `reason` | `text NOT NULL` | |
| `status` | `text NOT NULL DEFAULT 'requested'` | `requested`, `approved`, `completed`, `cancelled` |
| `clinical_condition` | `text` | |
| `completed_at` | `timestamptz` | |
| `...auditColumns()` | | |

```
INDEX (iq_tenant_id, episode_id)
INDEX (iq_tenant_id, status)
```

---

## 10. `discharge_plans` — Discharge checklist & planning

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid PK` | |
| `iq_tenant_id` | `uuid NOT NULL` | |
| `episode_id` | `uuid NOT NULL` | UNIQUE — one plan per episode |
| `status` | `text NOT NULL DEFAULT 'planning'` | `planning`, `clearance_pending`, `ready`, `completed` |
| `discharge_type` | `text` | `normal`, `lama`, `dama`, `abscond`, `death` |
| `checklist` | `jsonb DEFAULT '[]'` | `[{item, completed, completed_at, completed_by}]` |
| `clearance_status` | `jsonb DEFAULT '{}'` | `{medical, billing, pharmacy, nursing}` each bool |
| `planned_date` | `date` | |
| `discharge_notes` | `text` | |
| `...auditColumns()` | | |

```
UNIQUE (iq_tenant_id, episode_id)
INDEX (iq_tenant_id, status)
```

---

## 11. `discharge_summaries` — Final structured summary

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid PK` | |
| `iq_tenant_id` | `uuid NOT NULL` | |
| `episode_id` | `uuid NOT NULL` | |
| `summary_content` | `jsonb NOT NULL DEFAULT '{}'` | Diagnosis, investigations, procedures, meds at dc, follow-up |
| `status` | `text NOT NULL DEFAULT 'draft'` | `draft`, `signed` |
| `signed_at` | `timestamptz` | |
| `signed_by` | `uuid` | |
| `abdm_linked` | `boolean NOT NULL DEFAULT false` | |
| `...auditColumns()` | | |

```
INDEX (iq_tenant_id, episode_id)
```

---

## 12. `ipd_charges` — Running charge items

Local queue for charges pushed to `billing` module.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid PK` | |
| `iq_tenant_id` | `uuid NOT NULL` | |
| `episode_id` | `uuid NOT NULL` | |
| `order_id` | `uuid` | FK (soft) to ipd.inpatient_orders |
| `charge_type` | `text NOT NULL` | `bed_charge`, `consultation`, `procedure`, `medicine`, `consumable`, `manual` |
| `item_code` | `text NOT NULL` | |
| `description` | `text NOT NULL` | |
| `quantity` | `numeric(10,2) NOT NULL DEFAULT 1` | |
| `unit_price` | `numeric(18,4) NOT NULL` | |
| `net_amount` | `numeric(18,4) NOT NULL` | |
| `status` | `text NOT NULL DEFAULT 'pending'` | `pending`, `billed`, `cancelled` |
| `billed_at` | `timestamptz` | When pushed to billing |
| `billing_ref` | `uuid` | bill_item_id from billing module |
| `...auditColumns()` | | |

```
INDEX (iq_tenant_id, episode_id, status)
INDEX (iq_tenant_id, status)
```

---

## Relationships (logical)

```
ipd.wards ──1:N── ipd.beds
                     │
                     │ N:1
                     ▼
registration.visit ──1:1── ipd.episodes ──1:N── ipd.clinical_notes
                               │                ipd.vital_signs
                               │                ipd.inpatient_orders ──1:N── ipd.medication_administrations
                               │                ipd.nursing_tasks
                               │                ipd.ipd_charges
                               │                ipd.transfer_requests (from_ward + to_ward)
                               │                ipd.discharge_plans (1:1)
                               │                ipd.discharge_summaries
                               │
                          ipd.beds (current_episode_id for occupancy)
```

No cross-schema foreign keys (per platform convention). All references are soft UUIDs validated at the application layer.

Audit trail is handled by a separate platform-level audit log service — IPD Lite has no local `audit_log` table.

---

## Design decisions

| Decision | Rationale |
|---|---|
| **No separate ADT** | Wards + beds are embedded in `ipd` schema. Avoids cross-service HTTP for small-facility use case. |
| **Minimal patient denormalisation on episodes** | Only `patient_name` is denormalised for fast display on clinical surfaces. All other patient fields (`uhid`, `gender`, `age`) live in `registration` — the join cost is acceptable at Lite scale. |
| **JSONB for checklist/clearance** | Avoids 10+ narrow tables for Lite V1. Can extract to normalised tables if the schema grows. |
| **Charges as local queue** | `ipd_charges` holds pending charges. Pushed to `billing` module via its API. Billing owns payment/tariff finality. |
| **Simplified state machines** | 6 episode states (vs 15 in source), 5 order states, 5 bed states. No SLA engine. |
| **No separate nursing assessments table** | Notes + nursing tasks + vitals cover basic assessments. Pain/wound/fall-risk assessments are deferred. |
| **Parameterised vital_signs** | Tall/EAV via `vital_code` instead of flat columns. Bridges to `master-data.visitpad.vitals` catalog for unit labels, normal range colouring, and threshold alerts. New vital types are a config change, not a migration. |
