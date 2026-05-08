# Module Build Order — Fastest Path to Feature Parity and Beyond

This document defines the order in which modules and services should be built, optimized for two goals:

1. **Reach production HIMS feature parity as fast as possible** — so the existing system can be replaced
2. **Expand toward full AIIMS EOI scope** — using the platform foundation already in place

The build order is designed for a team of ~7 developers (2 leads, 5 engineers) using AI-assisted development tooling, with maximum parallelization where dependencies allow.

---

## 1. What the Production HIMS Actually Does

Before defining build order, we need to be precise about what "feature parity" means. The production system provides:

| Capability | Completeness | Complexity |
|------------|-------------|------------|
| **Patient registration** with dedup, ABHA linking, UHID generation | Full | Dedup algorithm is the only complex piece |
| **OPD visits** — create, queue by department, vitals (V1+V2), chief complaints, status workflow (registered → in-progress → completed), idle auto-complete | Full | Visit lifecycle state machine, free follow-up windows |
| **Prescriptions** — medicines, tests, imaging, vaccines, medical history, women's health, care plan | Full | Schema is wide but logic is mostly CRUD with status tracking |
| **Pharmacy** — dispensing against prescriptions, inventory (stock levels, expiry alerts, low-stock alerts), medicine master catalog, stock change audit logs | Full | Standard inventory management. Not heavily used in production; awaiting new product stories |
| **Lab reports** — upload from external LIMS via API key, ABDM linking, result display | Full | Inbound integration, not a full LIS. Not heavily used in production; awaiting new product stories |
| **Basic billing** — bill creation, retrieval by patient/visit | Partial (~30%) | Only 3 endpoints, no payment processing. Needs significant product rethink given its criticality |
| **Appointments** — schedule, view calendar, status tracking | Full | Standard scheduling |
| **ABDM/ABHA** — M1 enrollment, M2 linking/consent (in progress), FHIR bundle generation, care context management | ~85% | Protocol complexity, but lives in separate service |
| **Analytics dashboards** — footfall, doctor KPIs, revenue, medicine consumption, diagnosis patterns, wait times | Full | Read-only aggregations |
| **Reports** — doctor-wise, department-wise, diagnosis-wise with Excel/PDF export | Full | Standard reporting |
| **User/role management** — CRUD, bulk upload, Keycloak integration | Full | Straightforward |
| **Clinical reference data** — diagnoses, procedures, tests, medicines (bulk upload) | Full | Master data CRUD |
| **AI prescription extraction** — photo → extracted medicines/dosage | Working | External AI service integration |
| **Notifications** — in-app, WhatsApp (OPD slip delivery) | Partial | No WebSocket/push yet |
| **Attendance tracking** — check-in/out by shift | Full | Simple |

**Key observation:** Apart from the patient deduplication algorithm and the ABDM protocol flows, every feature above is straightforward CRUD with status tracking. The production system's value is in its completeness and production-readiness, not in algorithmic complexity.

---

## 2. Dependency Graph — What Blocks What

### Hard dependencies (must exist before downstream work begins)

```
User Management ──────────────────────────────────┐
       │                                           │
       ▼                                           │
Configurator ─────────────────────────────────┐    │
       │                                       │    │
       ▼                                       ▼    ▼
Master & Tenant Data                    EMPI / Patient Identity
       │                                       │
       └──────────┬───────────────┬────────────┘
                  │               │
                  ▼               ▼
            ┌─────────┐    ┌───────────┐
            │   OPD   │    │   ABDM    │ ◄── can start once EMPI exists
            │         │    │           │
            └────┬────┘    └───────────┘
                 │
          ┌──────┼──────┐
          ▼      ▼      ▼
        IPD  Pharmacy  Lab   ◄── await product stories / OPD events
              Billing        ◄── awaits product rethink
```

### What can run in parallel

- **User Management** and **Configurator** share no data model — can be built simultaneously
- **EMPI** and **Master & Tenant Data** can be built simultaneously once Configurator exists
- **OPD** and **ABDM** can be built simultaneously once the platform foundation is ready — ABDM works against the NHA sandbox independently, OPD works against EMPI and Master Data
- **Pharmacy**, **Lab**, and **Billing** are deferred until product stories arrive — they can then start in parallel, consuming OPD events

### Soft dependencies (beneficial but not blocking)

- ABDM integration benefits from EMPI but the protocol work can start in parallel
- Pharmacy, Lab, and Billing will consume OPD events when they are built — OPD should publish these events from day one so downstream modules can integrate when ready

---

## 3. Build Phases

### Phase 0: Platform Foundation

**What:** The five core modules + Integration Hub + platform infrastructure that every feature module depends on. (Updated 2026-05-08 per [ADR-0021](../adr/0021-record-foundation-fifth-core-module.md): Record Foundation is the fifth core module, but its v1 build-out happens in Phase 1; only its data model agreement is a Phase 0 exit criterion. Integration Hub control plane + FSM engine ship in Phase 0; the ABDM adapter implementation lands in Phase 1.)

**Who:** Full team. This is the critical path — nothing downstream can start until this is done.

| Component | What it provides | Dependencies |
|-----------|-----------------|--------------|
| **User Management** | Authentication (better-auth), JWT issuance, JWKS endpoint, role/assignment storage, IdP federation, SCIM | None — lowest in the graph |
| **Configurator** | Tenant provisioning, feature flags, module enablement, integration profiles, department/facility config (incl. HFR facility ID per ABDM) | User Management (auth) |
| **EMPI / Patient Identity** | Canonical patient record, dedup (port algorithm from production), ABHA number+address linking via `patient_identifiers`, FHIR Patient endpoint | User Management, Configurator |
| **Master & Tenant Data** | Drug formulary, ICD-10, LOINC, SNOMED, procedure codes, fee schedules, tenant overrides | User Management, Configurator |
| **Integration Hub (control plane + FSM engine)** | Generic integration registry, durable workflow FSM tables and engine, inbound/outbound message logs, audit stream. ABDM adapter slot present but empty until Phase 1. Per [ADR-0011](../adr/0011-integration-hub-split.md), [ADR-0020](../adr/0020-fsm-orchestration-for-integration-hub.md). | User Management, Configurator |
| **Record Foundation (data model only)** | Schema agreed and committed in [LLD](../lld/record-foundation/01-schema-design.md). v1 implementation deferred to Phase 1 (no consumers in Phase 0). | -- |
| **`@hims/ts-sdk-workflow`** | Generic FSM engine package consumed by Integration Hub | None |
| **`@hims/ts-sdk-fhir` (skeleton)** | Type definitions, profile registry constants, builder API surfaces. Implementation lands with the first consumer (Phase 1: OPD + Record Foundation). | None |
| **`@hims/ts-sdk-abha` (skeleton)** | ABHA types, validators, FSM state names | `@hims/ts-sdk-fhir` |
| **Module Shape SDK** | Cerbos policy template, identity adapter library, event publisher/consumer SDK, PEP middleware, tenant context middleware | User Management (for JWKS), Configurator (for tenant context) |
| **Event bus** | Inter-module event infrastructure (pub/sub) | Infrastructure only |
| **Platform BFF** | JWT verification, request routing for platform admin UI | User Management |

**Parallelization within Phase 0:**

```
Week 1+:  User Management ←── Lead 1 + 2 devs
          Event bus infra  ←── Lead 2 + 1 dev
          Module Shape SDK ←── 1 dev (starts with Cerbos policy template, identity adapter)

After User Management auth works:
          Configurator     ←── 2 devs
          EMPI             ←── Lead 1 + 1 dev (port dedup algorithm here)
          Master Data      ←── 1 dev
          Module Shape SDK ←── continues (now can integrate with real JWKS)
```

**Exit criteria:** A developer can provision a tenant, create a user, authenticate, register a patient (with dedup), look up reference data, see Cerbos authorize a request — all end-to-end. Additionally: Integration Hub registry endpoint accepts a registration with `kind=abdm`, the FSM engine can run a trivial test FSM definition end-to-end (start -> transition -> complete with audit row written), and the Record Foundation schema is committed and ERD reviewed by the team (data model agreed, no implementation).

---

### Phase 1: OPD + Billing Core + ABDM + Record Foundation v1 (Feature Parity)

**What:** The clinical core that matches what the production HIMS actually delivers day-to-day, plus a thin billing service, plus the ABDM Adapter implementation inside Integration Hub, plus the v1 of Record Foundation. Per the [CEO directive](../../../CLAUDE.md) framing Phase 0 + Phase 1 as "v1 production parity", and per [ADR-0021](../adr/0021-record-foundation-fifth-core-module.md), Record Foundation must be in this phase to support ABDM compliance.

**Who:** Full team fans out. Each module follows the Module Shape Template — the platform foundation handles auth, tenant isolation, and events.

| Module | What it covers | Platform dependencies | Notes |
|--------|---------------|----------------------|-------|
| **OPD** | Visit creation, queue/token by department, vitals (V1+V2), chief complaints, prescriptions (medicines/tests/imaging/vaccines), visit lifecycle (registered → in-progress → completed), free follow-up, idle auto-complete, addendum chain, consultation record snapshots, **OPD's FHIR serialiser for OPConsultRecord and Prescription resources** (per [ADR-0023](../adr/0023-distributed-fhir-assembly.md)) | EMPI (patient lookup), Master Data (drug catalog, ICD codes, test catalog), User Management (doctor assignment), `@hims/ts-sdk-fhir` | Port visit lifecycle, free follow-up logic, dual vitals from production. Publishes `prescription.created`, `service-request.created`, and `consultation.finalized` events (the latter with the FHIR resources attached for Record Foundation to compose into bundles). |
| **Billing (thin core)** | BillingAccount, Charge, Invoice, Payment. Charge-ingest API for clinical modules, auto-invoice capability, payment recording, bill retrieval by patient/visit | Master Data (fee schedules/tariffs), EMPI (patient identity) | Starts as an embedded library in OPD's process with its own schema (`billing.*`). Covers production HIMS pattern (bill at visit creation = auto-invoice) and EOI pattern (async charge capture). Extends later with Estimate, Deposit, Refund, Discount, FinancialClearance, approval workflows — additive, not breaking. |
| **Integration Hub: ABDM Adapter** | FSM definitions for M1 (Aadhaar OTP, mobile, biometric), scan-and-share, M2 (user-initiated linking, HIP-initiated linking), M3 HIP, M3 HIU; consent supervisor FSM. Implements the ABDM gateway client, Fidelius encryption helpers, and adapter dispatch. | Integration Hub control plane (Phase 0), Configurator (HFR facility ID), `@hims/ts-sdk-abha`, `@hims/ts-sdk-fhir` | The protocol implementation behind the FSM definitions in [02-fsm-specifications.md](../lld/integration-platform/02-fsm-specifications.md). Per [ADR-0020](../adr/0020-fsm-orchestration-for-integration-hub.md), workflows persist in `integration_hub.integration_workflows`; their state is auditable by SQL. |
| **Record Foundation v1** | Care-context registry, immutable bundle vault, external HIU bundle inbox, timeline read-model, erasure scheduler. Consumes `consultation.finalized` (assembles FHIR Document Bundle and stores) and `abdm.consent.*`, `abdm.health-record.received` events. | EMPI, Integration Hub (consent state), `@hims/ts-sdk-fhir` | Per [ADR-0021](../adr/0021-record-foundation-fifth-core-module.md). Schema: 6 tables. ~20 endpoints. Substrate for the Phase 4 EMR product. Phase 1 scope is intentionally minimal -- no specialty UI, no AI summaries, no MRD workflow. |
| **Analytics / Dashboards** | Patient footfall, doctor KPIs, visit statistics, department-level metrics | OPD (read projections), EMPI (patient demographics) | Read-only aggregation layer. Can be built incrementally as OPD data flows. |

**Parallelization within Phase 1:**

```
OPD + Billing            ←── Lead 1 + 3 devs (OPD largest; billing thin library in OPD process; OPD's FHIR serialiser is part of OPD)
Integration Hub ABDM     ←── Lead 2 + 1 dev (FSM definitions + adapter implementation against NHA sandbox)
Record Foundation v1     ←── 1 dev (consumer of consultation.finalized + abdm.* events; orchestrates Composition assembly)
Analytics                ←── 1 dev (starts once OPD data model stabilizes)
```

**Billing deployment model:** Billing starts as a library embedded in OPD's process (same service, separate schema). When other modules need to emit charges (Pharmacy, Lab, IPD), billing extracts to a standalone service — the code doesn't change, only the deployment topology.

**Exit criteria:** A patient can walk in, register (with ABHA linking via Integration Hub's M1 FSM and EMPI dedup), see a doctor (OPD visit with vitals, chief complaints, and prescription); on consultation finalisation a FHIR OpConsultRecord Document Bundle is composed by Record Foundation and stored immutably; the encounter's care context is published to ABDM and discoverable for HIP requests; an external HIU can request the patient's records under a granted consent and receive the bundle; the patient can also fetch their records from another HIP via the platform's HIU role and view them in the timeline; bills are auto-generated from visit charges; operations dashboards show footfall and doctor KPI.

---

### Phase 1.5: Product-Driven Modules (Awaiting Product Stories)

**What:** Pharmacy and Lab are deferred — not because they are technically complex, but because they need product rethink before engineering begins. Billing extensions (estimates, deposits, insurance, approval workflows) also await product stories.

| Module | Why deferred | When to start |
|--------|-------------|---------------|
| **Pharmacy** | Not heavily used in production. New product stories expected from product team. Standalone pharmacy deployments are a market opportunity that needs product-level scoping. | When product stories arrive. Can start immediately — OPD already publishes `prescription.created` events, billing charge-ingest API already exists |
| **Lab** | Production system only receives lab reports from external LIMS — it is not a full LIS. The company has a separate LIMS product. The new platform's Lab module needs product-level decisions on scope (inbound results only? full LIS? integration with company LIMS?) | When product team clarifies Lab module scope |
| **Billing extensions** | The thin billing core (Phase 1) covers charge capture, invoicing, and payments. Full revenue cycle features — estimates, deposits, refunds, discounts with approval workflows, financial clearance gates, insurance/TPA, GL posting — need product-level requirements. | When product team delivers billing requirements. Extensions are additive (new entities and endpoints), not changes to existing schema, so the Phase 1 billing data remains intact |

**Why this is safe:** The charge-capture event pattern decouples clinical modules from billing. OPD publishes chargeable events regardless of what billing features exist. When Pharmacy and Lab are built, they emit charges to the same billing API. When billing extensions are added, they layer on top of the existing account/charge/invoice/payment model without migration.

---

### Phase 2: First EOI Expansion

**What:** The next tier of hospital operations — inpatient care, emergency, and appointment scheduling. These can begin once OPD is stable and Phase 1.5 modules are being scoped by product.

| Module | What it covers | Key dependencies |
|--------|---------------|-----------------|
| **IPD + Nursing** | Admission, bed/ward management, ADT (admission-discharge-transfer) events, nursing care plans, medication administration records, diet orders | EMPI, OPD (admission orders), Master Data |
| **Emergency** | ED triage, emergency encounters, support for unidentified patients, medico-legal case flagging | EMPI (with "unknown patient" support), User Management |
| **Appointment Scheduling + Queue Management** | Appointment booking, doctor schedule management, department-based token/queue, online booking readiness | OPD (primary consumer), User Management (provider schedules), Configurator (department config) |

**Why this order:** IPD is the other half of hospital operations. Emergency is high-volume at AIIMS. Appointment scheduling was deferred from Phase 1 because the production HIMS runs walk-in OPD without sophisticated scheduling — but the EOI requires it. Insurance & Claims depends on Billing (Phase 1.5) and moves to whenever Billing is ready.

---

### Phase 3: Surgical & Advanced Diagnostics

| Module | What it covers |
|--------|---------------|
| **OT / Surgery + CSSD** | Surgical scheduling, OT room management, instrument set tracking, sterilization cycle management, pre-op/post-op workflows |
| **ICU + E-ICU** | Specialized inpatient monitoring, ventilator tracking, tele-ICU remote monitoring, nursing scales (GCS, APACHE) |
| **RIS / PACS** | Radiology scheduling, modality worklists, DICOM integration, radiology reporting, image viewing |
| **Blood Bank** | Donor management, blood product inventory, cross-match/compatibility, transfusion tracking |
| **Cath Lab + Endoscopy** | Specialized procedure scheduling, hemodynamic data, scope sterilization tracking |

---

### Phase 4: Administrative & Specialized

| Module | What it covers |
|--------|---------------|
| **Civil Registration** | Birth/death registration, certificate generation, government reporting APIs |
| **Medico-Legal / Forensic** | MLC/MLR case management, autopsy workflow, mortuary management, chain-of-custody tracking |
| **EMR (Unified View)** | Consolidated longitudinal patient timeline across all encounters — this is built incrementally as each clinical module contributes data, but the unified view/portal is a Phase 4 deliverable |
| **Vaccination** | Immunization scheduling, vaccine inventory, immunization registry reporting |
| **Clinical Support Services** | Physiotherapy, occupational therapy, speech therapy workflows |

---

### Phase 5: Platform Completion

| Module | What it covers |
|--------|---------------|
| **Reports & Analytics + MIS** | Cross-module reporting, operational dashboards, data warehouse projections |
| **AI Modules** | Clinical decision support, diagnostic assistance, prescription extraction (port from production) |
| **Web Portal** | Patient-facing portal (appointment booking, lab results, health records, ABDM consent) |
| **Biomedical Equipment** | Asset/equipment catalog, maintenance scheduling, AMC management |
| **Building Management** | HVAC, power, water, fire detection — standalone facility management |
| **Administrative** | HR/payroll integration, procurement, general administration |
| **Academic & Research** | Faculty management, course tracking, de-identified clinical data access |
| **Ambulance** | Fleet management, GPS tracking, dispatch, pre-hospital data handoff |
| **Diet & Kitchen** | Meal planning, inpatient diet management, kitchen production scheduling |

---

## 4. Natural Module Groupings

Some of the 38 EOI functional areas are so tightly coupled that they should be built as a single deployment unit:

| Group | EOI areas combined | Rationale |
|-------|-------------------|-----------|
| **Outpatient Services** | OPD + Appointment Scheduling + Queue Management | Share patient visit data model, workflow (book → queue → consult), and scaling characteristics |
| **Inpatient Services** | IPD + Nursing Care + Diet/Kitchen | Nursing is the execution arm of IPD; diet depends on inpatient census and diet orders; all share ADT events |
| **Surgical Services** | OT/Surgery + CSSD | CSSD exists primarily to serve OT; they share instrument set tracking |
| **Diagnostic Lab** | LIS + Blood Bank | Blood bank is a specialized lab; they share specimen management and result authorization |
| **Diagnostic Imaging** | RIS + PACS | Tightly coupled via DICOM; always deployed together |
| **Revenue Cycle** | Billing/Finance + Insurance/Claims | Claims are generated from bills; pre-authorization affects billing workflow |
| **Medico-Legal** | MLC/MLR + Forensic Medicine + Autopsy + Mortuary | Single medico-legal workflow chain sharing police/legal case data |
| **Civil Registration** | Birth Registration + Death Registration + Certificates | Administrative outputs triggered by clinical events, sharing government reporting APIs |
| **Emergency Services** | Emergency + Ambulance | Pre-hospital data flows directly into ED triage |
| **Facility Management** | Building Management + Biomedical Equipment | Both are asset/facility management with zero clinical dependency |
| **Analytics** | MIS Reports + Reports/Analytics + AI Modules | All downstream consumers sharing data warehouse and reporting engine |

These groupings do not prescribe that all areas in a group must be built at the same time — they can be built incrementally within the group. But they should share a deployment unit (service boundary) because they share data models and workflows.

---

## 5. The Charge-Capture Event Pattern

The single most important integration pattern is how Billing connects to clinical modules. Clinical modules do not call Billing — they emit chargeable events that Billing captures:

| Source module | Event | Billing creates |
|--------------|-------|----------------|
| OPD | `consultation.completed` | Consultation charge line item |
| Pharmacy | `drug.dispensed` | Drug charge line item |
| Lab | `test.completed` | Test charge line item |
| IPD | `bed.day.accrued` | Bed charge line item |
| OT | `surgery.completed` | Surgical charge line item |
| Radiology | `exam.completed` | Imaging charge line item |

This pattern keeps clinical modules independent of billing logic. It also solves the fragmented adoption constraint: if a hospital uses the platform's OPD but their legacy billing system, OPD still emits charge events — the legacy billing system (via Integration Hub) can consume them.

---

## 6. What "Standalone" Means for Module Design

Several modules can operate as standalone systems outside a full HIMS deployment. This directly affects the fragmented adoption constraint:

| Module | Standalone viable? | Real-world example |
|--------|-------------------|-------------------|
| Pharmacy | Yes | Community/retail pharmacies |
| LIS (Lab) | Yes | Standalone diagnostic labs (Dr. Lal PathLabs, SRL) |
| RIS/PACS | Yes | Standalone imaging centers |
| Blood Bank | Yes | Standalone blood donation centers |
| Appointment Scheduling | Yes | Practo, Zocdoc |
| Queue Management | Yes | Generic token/queue systems |
| Vaccination | Yes | Standalone immunization clinics |
| Biomedical Equipment | Yes | Standalone CMMS systems |
| Building Management | Yes | Standalone BMS (Honeywell, Siemens) |
| Ambulance | Yes | 108/102 ambulance services |

For these modules, the platform must support a deployment where the module runs with only the core platform modules (User Management, Configurator, Master Data) and receives clinical context from external systems via the Integration Hub. A standalone pharmacy deployment does not require OPD, IPD, Lab, or Billing to be deployed.

---

## 7. Cross-Module Queries and Read Projections

Modules own separate schemas and cannot JOIN across them. But many screens need data from multiple modules — a "patient visits" list shows visit data (OPD), doctor name (User Management), department (Configurator), and bill status (Billing). Two patterns solve this, and both should be available from Phase 0.

### Pattern 1: BFF aggregation (default for simple cases)

The platform BFF makes parallel calls to multiple modules and merges the results. One module owns pagination (typically the one whose data is primary), and the BFF enriches with lookups to other modules.

```
Frontend → BFF → parallel:
                  → OPD: GET /visits?patient_id=X&page=1
                  → Billing: GET /accounts?encounter_ids=[...]
                  → User Management: cached doctor names
              ← BFF merges, returns unified response
```

Works well when: one module clearly owns the query, enrichment data is small and cacheable, and you don't need to sort/filter by cross-module fields.

### Pattern 2: Local read projections (when BFF aggregation isn't enough)

Each module subscribes to events from other modules and maintains a local projection table in its own schema. These projections are denormalized, read-only copies of data the module needs for its own queries.

```
OPD subscribes to:
  - user.updated → opd.doctor_projection (name, department, specialty)
  - billing.invoice.created → opd.billing_projection (encounter_id, bill_status, amount)

OPD can now serve paginated queries with sort/filter on doctor name or bill status:
  SELECT v.*, dp.name, bp.status
  FROM opd.visits v
  JOIN opd.doctor_projection dp ON v.doctor_id = dp.user_id
  LEFT JOIN opd.billing_projection bp ON v.id = bp.encounter_id
  WHERE bp.status = 'unpaid'
  ORDER BY dp.name
```

Projections are eventual-consistent (seconds of delay after an event). The source of truth remains in the owning module. This is lightweight CQRS — no separate read database, just projection tables within each module's existing schema.

### Phase 0 requirement: Rich event payloads

This only works if events carry enough data for consumers to build projections without calling back to the source module. This convention must be established in Phase 0 when the event SDK is built — retrofitting rich payloads later means re-publishing historical events.

**Rule:** Every event payload must include all fields that any consumer might reasonably project. A `user.updated` event should carry `{ id, name, department_id, department_name, roles, specialty }`, not just `{ id }`. A `billing.invoice.created` event should carry `{ account_id, encounter_id, status, total, outstanding_balance }`, not just `{ invoice_id }`.

This is not premature optimization — it is a convention that prevents a class of distributed coupling problems. Getting it wrong early means either thin events that force synchronous callbacks (defeating the purpose of events) or a painful event schema migration later.

---

## 8. Team Allocation Model

With 7 developers and 2 leads:

### Phase 0 (Platform Foundation) — Full team, focused

| Stream | People | Work |
|--------|--------|------|
| Identity + AuthZ | Lead 1 + 2 devs | User Management, Cerbos policy infrastructure, Module Shape SDK (identity adapter, PEP middleware) |
| Platform Infrastructure | Lead 2 + 1 dev | Event bus, Configurator, platform BFF |
| Data Foundation | 2 devs | EMPI (+ port dedup algorithm), Master & Tenant Data |

### Phase 1 (OPD + Billing Core + ABDM) — Fan out

| Stream | People | Work |
|--------|--------|------|
| OPD + Billing | Lead 1 + 3 devs | Visit lifecycle, prescriptions, vitals, queue + thin billing library (charge ingest, auto-invoice, payments) |
| ABDM | Lead 2 + 1 dev | Protocol rebuild within Integration Hub, NHA sandbox testing |
| Analytics | 1 dev | Dashboards once OPD data model stabilizes |

### Phase 1.5 (Product-Driven) — As product stories arrive

| Stream | People | Work |
|--------|--------|------|
| Pharmacy | 1-2 devs | Follows Module Shape Template, consumes OPD prescription events, emits charges to billing |
| Lab | 1-2 devs | Scope depends on product decision (inbound results vs. full LIS) |
| Billing extensions | 1-2 devs | Estimates, deposits, refunds, discounts, financial clearance, insurance — additive to Phase 1 core |

### Phase 2+ — Rotate based on priority

Team rotates across modules based on EOI priorities and AIIMS deployment timeline. Each module follows the same shape template, so any developer who built one module can build the next. The platform foundation work from Phase 0 is the only part that requires deep architectural knowledge.
