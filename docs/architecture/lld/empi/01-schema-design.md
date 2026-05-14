# EMPI — Schema Design

**Module:** EMPI / Patient Identity (core platform module)  
**Schema name:** `empi`  
**Related HLD:** [02-core-modules.md §2](../../hld/02-core-modules.md#2-empi--patient-identity)  
**Related ADRs:** [ADR-0007](../../adr/0007-empi-dedicated-platform-service.md) (EMPI as dedicated platform service) | [ADR-0012](../../adr/0012-multi-tenancy-isolation-strategy.md) (Multi-tenancy isolation)  
**ERD (visual):** [`empi.erd.json`](./empi.erd.json) — open in VS Code with ERD Editor extension  
**Schema reference:** [`schema-reference.json`](./schema-reference.json) — full column descriptions, indexes, check constraints, Citus distribution notes

**Phasing:** The MVP ships 5 tables with full registration, search, and dedup. Two additional tables ship in schema but with logic deferred to post-launch.

| Phase | What ships |
|-------|-----------|
| **MVP** | `patients`, `patient_source_records`, `patient_identifiers`, `patient_addresses`, `sequence_counters`. Registration with synchronous dedup, search by name/phone/UHID/ABHA, UHID generation, ABHA linking, basic CRUD. Events: `patient.created`, `patient.updated`, `patient.identifier-linked`. |
| **Post-launch** | `match_candidates` logic (batch dedup job, review queue UI). `merge_history` logic (merge/unmerge workflows, `patient.merged` event). Golden record arbitration from multiple source records. FHIR Patient endpoint. |

---

## 1. Data model — Golden record with source provenance

The EMPI uses a **golden record pattern** with source record tracking:

| Layer | Table | Purpose |
|-------|-------|---------|
| **Golden record** | `patients` | Canonical patient identity. What every other module sees and references. |
| **Source provenance** | `patient_source_records` | Tracks which system/encounter contributed data. Enables non-destructive merge arbitration. |
| **Cross-references** | `patient_identifiers` | N-per-patient external identifiers (ABHA addresses, legacy MRNs, insurance IDs). |
| **Addresses** | `patient_addresses` | Normalized multi-field address structs with type discriminator. |
| **Sequences** | `sequence_counters` | Tenant-scoped UHID generation. |
| **Future: dedup queue** | `match_candidates` | Batch dedup results for human review. |
| **Future: merge audit** | `merge_history` | Full merge/unmerge audit trail with pre-merge snapshots. |

### Why golden record + source records (not flat)

The production HIMS uses a flat patient table. This design adds `patient_source_records` because:

1. **Non-destructive merge.** When merging, source records from the losing patient re-link to the winning patient. The original data contributions are preserved — you can always see "this phone number came from the OPD registration on Jan 5, that name spelling came from ABDM KYC."
2. **Unmerge is trivial.** Detach source records back to a restored patient record. No data reconstruction needed.
3. **MVP cost is zero.** At MVP, registration creates one source record per patient (1:1). The table exists but doesn't complicate any query pattern. OPD still queries `patients` directly.

### What stays on the golden record (not normalized further)

Demographics, phone numbers, emergency contact — these stay as columns on `patients` because:
- They're read on nearly every patient access (registration desk, OPD visit, lab order)
- The 95% query pattern is single-row reads by UHID or phone
- Emergency contact is always exactly one (no N-per-patient complexity)
- Normalizing would add JOINs to every downstream module's patient projection sync

---

## 2. UHID generation

**Format:** `YYMMDDTTTTTXXXXXXX` — preserved from production.

| Segment | Length | Source |
|---------|--------|--------|
| `YYMMDD` | 6 | Current date |
| `TTTTT` | 5 | Tenant numeric code (mapped from tenant_id) |
| `XXXXXXX` | 7 | Daily sequence (resets each day) |

**Mechanism:** The `sequence_counters` table stores per-tenant daily counters. UHID generation happens atomically within the patient creation transaction:

```sql
UPDATE empi.sequence_counters
SET current_value = current_value + 1
WHERE iq_tenant_id = :tenant_id AND sequence_name = :key
RETURNING current_value;

-- key format: 'uhid_YYMMDD' (e.g., 'uhid_260505')
-- If no row exists, INSERT with current_value = 1 (upsert)
```

This is a single-row update on a co-located shard (same tenant_id) — no distributed coordination needed.

**Tenant numeric code:** A 5-digit code derived from the tenant. The production system uses a lookup function (`getTenantNumericCode`). In the new system, this is stored as `tenant_numeric_code` on the Configurator's `tenants` table (a reference table, replicated to all nodes). EMPI reads it at tenant context initialization and caches it — no per-request lookup needed.

---

## 3. Deduplication strategy

### MVP: Synchronous, deterministic (port from production)

At registration time, before creating a patient record, the EMPI checks for potential duplicates using blocking keys:

| Blocking key | Match logic |
|-------------|-------------|
| Phone number | Exact match on `phone_number` |
| Name | Phonetic similarity (Soundex or Double Metaphone on `full_name`) |
| Age | Within ±2 years of `age_years` (or computed from `date_of_birth`) |
| Gender | Exact match |

**Algorithm (ported from production):** If phone matches AND name is phonetically similar AND age is within range AND gender matches → potential duplicate found.

**Registration flow:**

1. Operator submits patient registration
2. EMPI runs blocking query: `WHERE iq_tenant_id = :tid AND phone_number = :phone AND gender = :gender`
3. For matching rows, compute phonetic similarity on name and age proximity
4. If match found → return match to caller with flag `potential_duplicate: true`
5. Caller (OPD frontend) shows: "Similar patient found — use existing, update existing, or create new"
6. If operator chooses "create new" → `force_create: true` flag bypasses dedup
7. If no match → create patient normally

**The "create new" button** (missing in production) is explicitly supported via `force_create`. This handles genuinely different patients who happen to share demographics (father and son with same phone, common names in same age bracket).

### Post-launch: Probabilistic batch dedup

Future enhancement using `match_candidates` table:
- Nightly batch job scans for duplicates missed by synchronous check (different channels, data imports)
- Uses Fellegi-Sunter probabilistic model with configurable weights per field
- Results queued for human review with confidence scores
- Resolution: confirm match (trigger merge) or confirm distinct (dismiss)

---

## 4. ABHA integration

### What EMPI stores

| Data | Where | Cardinality |
|------|-------|-------------|
| ABHA number (14-digit) | `patients.abha_number` | 0..1 per patient |
| ABHA addresses | `patient_identifiers` (type: `abha_address`) | 0..N per patient |
| PHR addresses | `patient_identifiers` (type: `phr_address`) | 0..N per patient |

### Business rules

- **ABHA number presence = KYC verified.** No separate `is_kyc_verified` flag needed.
- **ABHA number is 1:1 per patient** — it's a dedicated column, not in the identifiers table.
- **ABHA addresses are 1:N** — a patient can have multiple, stored in `patient_identifiers`.
- **Per-encounter ABHA choice is NOT in EMPI.** When a patient registers for a visit, they may choose which ABHA address to use (or opt for "manual registration" with no ABDM linking). This choice belongs on the OPD visit record, not in EMPI. EMPI stores the identity facts; encounter modules store the per-visit decisions.
- **No Aadhaar storage.** Legal restriction — Aadhaar cannot be persisted in the database.

### ABHA linking flow

1. Patient provides ABHA details during registration (or links later)
2. EMPI stores `abha_number` on golden record
3. EMPI creates `patient_identifiers` rows for each ABHA address
4. Source record captures the ABDM KYC verification snapshot
5. EMPI publishes `patient.identifier-linked` event
6. Downstream modules update their patient projections if needed

---

## 5. Cross-tenant isolation

**Model: Completely isolated per tenant.**

- Each patient row belongs to exactly one tenant via `iq_tenant_id`
- A physical person registering at two tenants (e.g., AIIMS Delhi and AIIMS Patna) gets two separate patient records
- No cross-tenant patient visibility, search, or linking at MVP
- ABHA could theoretically detect same-person across tenants (same ABHA number), but this is not implemented

**Why:** Simplifies the Citus distribution model. All patient queries are single-shard. No org-level index or cross-tenant merge complexity. If cross-tenant patient linking is needed later, it's an additive feature (new `org_patient_links` table), not a migration of existing data.

---

## 6. Citus distribution strategy

| Table | Distribution | Notes |
|-------|-------------|-------|
| `patients` | Distributed by `iq_tenant_id` | All patient queries are tenant-scoped |
| `patient_source_records` | Distributed by `iq_tenant_id` | Co-located with patients for shard-local JOINs |
| `patient_identifiers` | Distributed by `iq_tenant_id` | Co-located with patients |
| `patient_addresses` | Distributed by `iq_tenant_id` | Co-located with patients |
| `sequence_counters` | Distributed by `iq_tenant_id` | UHID generation is shard-local |
| `match_candidates` | Distributed by `iq_tenant_id` | Co-located for patient lookups |
| `merge_history` | Distributed by `iq_tenant_id` | Co-located for merge queries |

All JOINs within a tenant are shard-local. No reference tables in EMPI — unlike Configurator/Master Data, EMPI has no globally-shared data.

---

## 7. Events published

| Event | When | Key payload fields |
|-------|------|-------------------|
| `patient.created` | New patient registered | id, iq_tenant_id, uhid, full_name, first_name, last_name, date_of_birth, gender, phone_number, abha_number, status |
| `patient.updated` | Demographics modified | id, iq_tenant_id, uhid, changed_fields, full_name, date_of_birth, gender, phone_number, abha_number, status |
| `patient.merged` | Two records merged (post-launch) | iq_tenant_id, surviving_patient_id, merged_patient_id, surviving_uhid, merge_history_id |
| `patient.status-changed` | Status transition | id, iq_tenant_id, uhid, old_status, new_status |
| `patient.identifier-linked` | New identifier added | id, iq_tenant_id, patient_id, identifier_type, identifier_value, issuing_system |

**Rich payloads:** Per [database principle §8](../../analysis/03-database-principles.md#8-projection-tables-are-first-class-schema-citizens) and [build-order doc §7](../../analysis/02-module-build-order.md#7-cross-module-queries-and-read-projections), events carry all fields consumers might project — not just IDs. OPD's `patient_projection` table can be fully maintained from `patient.created` and `patient.updated` events without calling back to EMPI.

---

## 8. Downstream module integration

### How OPD (and other modules) use EMPI

1. **Registration:** OPD calls EMPI's patient registration API. EMPI runs dedup, generates UHID, stores record, publishes `patient.created`.
2. **Search:** OPD calls EMPI's search API (by name, phone, UHID, ABHA). Gets back patient identity for visit creation.
3. **Projection:** OPD maintains `opd.patient_projection` table synced from EMPI events. Used for local queries that need patient name/gender alongside visit data.
4. **No direct schema access.** OPD never queries `empi.*` tables directly. All access through EMPI's APIs or event-sourced projections.

### Patient projection pattern (consuming modules)

```sql
-- Example: what OPD would maintain
CREATE TABLE opd.patient_projection (
    patient_id    UUID NOT NULL,
    iq_tenant_id  UUID NOT NULL,
    uhid          TEXT,
    full_name     TEXT,
    date_of_birth DATE,
    gender        TEXT,
    phone_number  TEXT,
    abha_number   TEXT,
    status        TEXT,
    last_synced   TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (iq_tenant_id, patient_id)
);
```

---

## 9. Audit column exceptions

| Table | Missing | Justification |
|-------|---------|---------------|
| `patient_source_records` | `updated_at`, `updated_by` | Insert-only pattern. Source records are not edited — they represent a point-in-time snapshot. |
| `patient_identifiers` | `updated_at`, `updated_by` | Create/deactivate pattern. Identifiers are linked and deactivated (`is_active = false`), not edited. |
| `sequence_counters` | All four audit columns | Infrastructure table. Only operation is atomic increment — no human actor, no meaningful timestamp beyond the counter value itself. |
| `match_candidates` | `updated_at`, `updated_by` | Uses `reviewed_at`/`reviewed_by` as semantic equivalents for resolution. |
| `merge_history` | Standard names | Uses semantic equivalents: `merged_at`/`merged_by` for creation, `unmerged_at`/`unmerged_by` for reversal. |

---

## 10. What EMPI does NOT own

The production HIMS patient schema includes data that does not belong in the patient identity module:

| Data | Belongs in | Why not EMPI |
|------|-----------|--------------|
| Vitals (BP, pulse, temp, SpO2) | OPD module | Clinical observation per encounter, not identity |
| Allergies, chronic conditions | OPD / Clinical module | Medical history, changes over time, encounter-scoped |
| Current medications | OPD / Pharmacy | Prescription data, per-visit |
| Past surgeries | OPD / Surgical module | Clinical history |
| Family history | OPD / Clinical module | Medical context |
| Insurance (provider, policy, validity) | Billing module | Revenue cycle data |
| Visit count | OPD module | Operational metric per module |

EMPI owns **identity** (who is this person?) — not **clinical state** (what is their medical condition?).
