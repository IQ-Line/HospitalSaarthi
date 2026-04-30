# 04 — Stakeholders and User Populations

This document describes who uses the system, what they need, and how they interact. These are the real people (and systems) that any architecture must serve.

---

## 1. Clinical staff

### 1.1 Doctors

**Who:** Attending physicians, residents, consultants, specialists (cardiologists, radiologists, oncologists, etc.), super-specialists. At AIIMS, this includes faculty who also teach and conduct research.

**What they need:**
- Fast patient lookup — find a patient's record in seconds, not minutes.
- Patient-context launch — opening a patient once gives access to all relevant clinical functions (lab results, imaging, medications, clinical notes, encounter history) without re-searching.
- Clinical decision support — drug interaction alerts, allergy warnings, differential diagnosis aids.
- Order entry — order lab tests, imaging, medications, referrals from within the clinical workflow.
- Clinical documentation — progress notes, discharge summaries, operative notes. Many prefer dictation/speech-to-text over typing.
- Cross-department visibility — a consultant who sees patients across departments needs access to records from all of them.
- Mobile access — ward rounds with a tablet, not a desktop.

**How they interact:** High-frequency, high-urgency, low patience for slow systems. A doctor in a busy OPD clinic sees a patient every 3-5 minutes. Any latency or additional click count is a direct burden.

**Authorization considerations:** Doctors need broad read access to patient records within their scope (department, specialty, assigned patients) but fine-grained write access (only they can enter clinical notes in their specialty). Some may work at multiple hospitals. Break-glass access for emergencies.

### 1.2 Nurses

**Who:** Staff nurses, charge nurses, nursing supervisors, nurse practitioners.

**What they need:**
- Patient assignment and task lists — which patients they're responsible for, what needs to be done (vital signs, medication administration, wound care).
- Medication administration records (MAR) — barcode scanning of medications and patient wristbands.
- Nursing assessments and care plans — structured documentation.
- Vital signs entry — frequently, throughout the shift.
- Alerts — critical lab results, medication due, deteriorating patient scores.

**How they interact:** Continuous use throughout a 8-12 hour shift. Often at the bedside on a shared workstation or mobile device. Workflow is task-driven, not patient-visit-driven.

**Authorization considerations:** Some facilities allow nurses to order routine lab tests or administer PRN medications without a doctor's explicit order. This varies by hospital policy — must be configurable per tenant.

### 1.3 Lab technicians

**Who:** Pathology lab technicians, phlebotomists, histopathology staff.

**What they need:**
- Order worklists — pending test orders, organized by urgency and specimen type.
- Specimen tracking — barcode-based tracking from collection to reporting.
- Result entry — structured entry of test results, with normal range validation.
- Analyzer integration — results auto-populated from lab analyzers (via HL7v2 or proprietary protocols).
- Quality control — QC tracking, repeat testing, result authorization workflows.

**How they interact:** Batch-oriented within the lab. Receive orders, process specimens, enter/verify results. Often operate specialized equipment with its own interfaces.

**Authorization considerations:** Can view orders and enter results but typically cannot view full patient clinical records. Supervisor review may be required before results are finalized.

### 1.4 Pharmacists

**Who:** Clinical pharmacists, dispensing pharmacists, pharmacy assistants.

**What they need:**
- Prescription verification — review prescriptions for drug interactions, allergies, dosing errors.
- Dispensing workflow — pick, verify, dispense, record.
- Inventory management — stock levels, expiry tracking, reorder points, supplier management.
- Formulary management — which drugs are stocked, local naming conventions, pricing.
- Controlled substance tracking — narcotics register, regulatory reporting.

**How they interact:** Prescription-driven. Each dispensing event is a discrete transaction.

**Authorization considerations:** Pharmacists may need to view relevant patient clinical data (allergies, current medications, diagnosis) for prescription verification but not full clinical records.

### 1.5 Radiologists and imaging technicians

**Who:** Radiologists (reporting), imaging technicians (conducting scans), PACS administrators.

**What they need:**
- Worklist of pending imaging orders.
- PACS integration — view images directly from the platform.
- Reporting workflow — structured or free-text radiology reports with template support.
- Prior image comparison — access to previous imaging studies for the same patient.
- DICOM compliance for image exchange.

---

## 2. Administrative staff

### 2.1 Registration/front desk clerks

**What they need:**
- Patient registration and search — fast, with deduplication alerts.
- Appointment scheduling — booking, rescheduling, cancellation.
- Queue management — calling patients, managing wait lists.
- ABHA linking — registering patients with their national health ID.

**Authorization considerations:** Can create and update patient demographics but cannot view clinical notes, lab results, or other clinical data.

### 2.2 Billing and finance staff

**What they need:**
- Charge capture from clinical modules (lab tests ordered, procedures performed, medications dispensed).
- Insurance/claims processing — pre-authorization, claim submission, reconciliation.
- Fee schedule management — per-service pricing, package pricing, discounts.
- Revenue reporting and analytics.

### 2.3 Medical records staff (MRD)

**What they need:**
- Record completion tracking — ensuring discharge summaries are complete.
- ICD/procedure coding — assigning standardized codes for reporting and billing.
- Record retrieval — finding and providing records for legal, audit, or quality purposes.
- Statistics and reporting — disease burden, procedure counts, quality indicators.

---

## 3. Hospital administrators

### 3.1 Department heads

**What they need:**
- Department-level dashboards — patient volume, bed occupancy, pending orders, staff performance.
- Configuration authority — department-specific workflows, formulary preferences, authorization rules within their department.
- Quality metrics — infection rates, readmission rates, average length of stay.

**Authorization considerations:** Full access to their department's data. May need read access to related departments (e.g., a surgical department head needs to see Radiology and Lab data for their patients).

### 3.2 Medical superintendent / Hospital director

**What they need:**
- Hospital-wide dashboards and MIS reports.
- Cross-department analytics.
- Exception management — break-glass review, policy override approval.
- Strategic planning data — capacity utilization, revenue trends, case mix.

**Authorization considerations:** Broad read access across the hospital, but should not routinely access individual patient records without cause. Audit of administrative access is important.

### 3.3 IT administrators

**What they need:**
- User provisioning and deprovisioning — creating accounts, assigning roles, managing department affiliations.
- System configuration — enabling/disabling modules, configuring integrations, managing feature flags.
- Monitoring — system health, error rates, performance metrics.
- Integration management — configuring connections to legacy systems, managing API keys and certificates.

---

## 4. Patients

**How they interact:** Through a web portal and/or mobile application. They are external users, not hospital staff.

**What they need:**
- Appointment booking and management.
- Access to their own health records (lab results, prescriptions, discharge summaries).
- ABHA integration — linking their national health account, consent management for data sharing.
- Notifications — appointment reminders, lab results ready, prescription refill reminders.

**Authorization considerations:** Patients see only their own data. They do not see other patients' data. They may grant or revoke consent for data sharing with other providers via ABDM.

---

## 5. External systems (non-human actors)

### 5.1 Legacy HIS at partner hospitals

**What they are:** Existing hospital information systems that the platform must interoperate with during fragmented adoption.

**Interaction protocol:** HL7v2 (most common for existing systems), FHIR R4 (for newer systems), proprietary APIs (for some vendors).

**Authorization considerations:** External systems are principals in the authorization model. They authenticate (API key, mTLS, OAuth) and are authorized like any other actor, with their own permission scope.

### 5.2 ABDM / NHA services

**What they are:** National health infrastructure — registries (Health Facility Registry, Health Professional Registry), consent manager, Health Information Exchange.

**Interaction protocol:** ABDM-specific FHIR profiles, ABDM API specifications.

**Interaction pattern:** Bidirectional. The platform calls ABDM to register facilities, link ABHA IDs. ABDM calls the platform to request health records (HIU flows), deliver consent artifacts, and perform facility discovery.

### 5.3 Lab analyzers and medical devices

**What they are:** Physical laboratory instruments, ICU monitors, radiology equipment.

**Interaction protocol:** HL7v2 (lab analyzers), DICOM (radiology), proprietary protocols (many devices), IoT protocols (newer monitoring equipment).

### 5.4 Insurance providers

**What they are:** Government schemes (Ayushman Bharat PMJAY, state health insurance) and private insurance companies.

**Interaction protocol:** Varies widely. Some provide APIs, some use portals, some accept HL7/FHIR. Pre-authorization, claim submission, and adjudication workflows.

---

## 6. Internal principals (service accounts)

**What they are:** Non-human actors within the platform — automated processes, scheduled jobs, inter-module service calls.

**Why they matter:** When OPD creates a lab order, it calls the Lab module using a service account, not the doctor's personal credential. Service accounts must be first-class principals with their own roles and authorization rules. The audit trail must record both the service account that made the call and the originating human user.
