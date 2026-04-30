# 03 — Scenarios

These are concrete scenarios the system must handle. Each scenario is a real-world situation that will occur in production. An architecture that cannot accommodate all of these scenarios is incomplete.

---

## Deployment scenarios

### S1. AIIMS New Delhi — full platform, dedicated infrastructure

AIIMS deploys all ~38 functional areas on dedicated on-premises infrastructure (Kubernetes cluster). Single tenant. Serves 60+ departments across multiple campuses (main hospital, Trauma Centre, National Cancer Institute Jhajjar, etc.). Must integrate with ABDM/NHA for national health ID (ABHA) linking and health data exchange. Must integrate with existing legacy systems during migration (AIIMS currently runs various departmental systems). The on-premises BCP environment must maintain operations during cloud/network disruptions.

**Key questions this scenario raises:**
- How does the system handle multi-campus operation within a single tenant?
- How are departments across campuses distinguished in authorization?
- What is the migration path from existing AIIMS systems to the new platform?
- How does the BCP on-prem environment sync with cloud DC/DR?

### S2. Hospital chain — multi-tenant, centralized management

A hospital chain (e.g., 5 hospitals) deploys the platform as SaaS. One organization, five tenants (one per hospital). The chain's management needs consolidated reporting across all five hospitals. Clinical staff may work at multiple hospitals (a consulting specialist practices at Hospital A on Monday and Hospital B on Tuesday).

**Key questions this scenario raises:**
- How does a user have roles in multiple tenants under the same organization?
- How does context-switching work (doctor moves from Hospital A to Hospital B)?
- How does cross-tenant reporting work without violating tenant data isolation?
- Can the chain's IT administrator manage user roles centrally across all five hospitals?

### S3. District hospital — fragmented adoption alongside legacy

A 100-bed district hospital currently runs a legacy HIS for OPD and billing. They adopt only the Lab module and Pharmacy module from the platform. Everything else remains on the legacy system.

**Key questions this scenario raises:**
- How does the Lab module receive test orders from the legacy OPD system?
- How does the Pharmacy module receive prescriptions from the legacy OPD system?
- How are patients identified across the platform modules and the legacy system? (The legacy system has its own MRNs.)
- What is the minimum platform infrastructure required to run just Lab + Pharmacy?
- If the hospital later wants to adopt OPD from the platform, what is the migration path?

### S4. Standalone pharmacy — minimal deployment

A single pharmacy (no hospital affiliation) deploys only the Pharmacy module. They need inventory management, prescription dispensing, and billing. They do not have a Kubernetes cluster. They may not have an IT team.

**Key questions this scenario raises:**
- What is the absolute minimum footprint (infrastructure, services) required?
- Can the system run as a single process without Kubernetes?
- Do they still need patient identity management? (Pharmacies dispense to patients.)
- What platform dependencies are truly mandatory vs. optional for this scenario?

### S5. Government health authority — multi-hospital deployment

A state health department deploys the platform across 50 primary health centres and 5 district hospitals. They need centralized monitoring, standardized protocols, and aggregate reporting. Each facility is a separate tenant, but the authority manages them all.

**Key questions this scenario raises:**
- How does the platform scale to 50+ tenants on shared infrastructure?
- How does the health authority get cross-tenant analytics without accessing patient data?
- Can facility-level administrators customize their local configuration (e.g., local formulary) while the health authority controls the base standards?

---

## Adoption and migration scenarios

### S6. Module-by-module migration

A hospital starts with the Lab module (S3). Six months later, they adopt OPD. A year later, they add IPD and EMR. Eventually, they retire the legacy system entirely.

**Key questions this scenario raises:**
- At each stage, how does the newly adopted module integrate with the existing mix of platform modules and legacy systems?
- How is patient identity reconciled when a module is migrated? (Patients registered in the legacy OPD must be recognized in the platform's Lab module.)
- Is there a "migration mode" where the Integration Hub brokers between the legacy system and the new module, then gets removed when the legacy system is retired?
- What happens to historical data in the legacy system when a module is migrated?

### S7. Third-party module integration

A hospital uses the platform for most modules but has a specialized third-party radiology system (RIS-PACS) that they want to keep. The platform must integrate with it, not replace it.

**Key questions this scenario raises:**
- How does the platform discover and configure an integration with a third-party system?
- What protocols does the integration layer support? (DICOM for radiology, HL7v2 for orders/results, FHIR for modern systems.)
- How is the third-party system authenticated and authorized? It needs access to patient data but is not a platform module.
- How does the patient timeline/longitudinal record include data from the third-party system?

### S8. Company's own LIMS/RIS-PACS integration

The company's existing LIMS + RIS-PACS (legacy product) needs to integrate with the new HIMS platform. This is the same problem as S7, but with an internal product.

**Key questions this scenario raises:**
- Is the integration architecture the same regardless of whether the external system is internal (company's LIMS) or truly external (third-party)?
- Is there a migration path from the legacy LIMS to a platform-native Lab module?
- Should the LIMS be gradually subsumed, or run indefinitely alongside the platform?

---

## Clinical workflow scenarios

### S9. OPD patient registration — new patient

A clerk at the OPD front desk registers a patient who has never visited the hospital before. The patient provides their ABHA number, name, and phone number.

**What must happen:**
1. System checks if the patient already exists (by ABHA, name+phone, or other identifiers).
2. If no match, creates a new patient record with a unique internal ID, linked to the ABHA number.
3. The patient is now visible to any module the clerk navigates to (Lab for ordering tests, Pharmacy for prescriptions, etc.).
4. The clerk's access is limited by their role — they can register patients but not view clinical notes.

### S10. OPD patient registration — returning patient, identity resolution

A patient returns to the hospital. They give a different phone number than last time. The clerk searches by name and date of birth and finds a probable match with a confidence score.

**What must happen:**
1. The system presents the probable match to the clerk with a confidence indicator.
2. The clerk confirms it's the same person (or flags it for review by a data quality team).
3. The existing record is updated with the new phone number.
4. If the patient has also been registered at another facility in the same hospital chain, their records must be linkable.

### S11. Cross-module clinical workflow — doctor orders lab test

A doctor in OPD examines a patient and orders a lab test (CBC). The order must reach the Lab module.

**What must happen:**
1. The doctor's authorization is verified — they have the role and department context to order lab tests for this patient.
2. The lab order is created in OPD's context and communicated to the Lab module.
3. The Lab module receives the order, associates it with the correct patient, and queues it for processing.
4. When results are ready, the Lab module communicates them back. The doctor sees the results in the patient's record.
5. If the Lab module is a platform module, this is an inter-module event/API call. If the Lab is a legacy system, the same flow works through the integration layer.

### S12. Break-glass emergency access

A patient arrives at Emergency unconscious, no identification. A doctor needs to access the patient's medication history to avoid dangerous drug interactions, but the patient's record (if one exists) is in a department the doctor doesn't normally have access to.

**What must happen:**
1. The doctor invokes a break-glass override, stating the emergency reason.
2. The system grants temporary elevated access.
3. The access is logged with full context: who, what they accessed, when, and the stated reason.
4. A compliance officer is notified and must review the break-glass event.
5. If no prior record exists, the system allows emergency registration with minimal data, with post-hoc completion once the patient is identified.

### S13. Service-to-service authorization

The OPD module needs to create a lab order in the Lab module on behalf of a doctor. This is a service-to-service call, not a direct user action.

**What must happen:**
1. The OPD module calls the Lab module using a service account credential (not the doctor's personal token).
2. The Lab module authenticates and authorizes the service account — it must verify that OPD is allowed to create lab orders.
3. The originating user (the doctor) is recorded in the order for audit purposes, but authorization is based on the service account's permissions.
4. The Lab module cannot distinguish whether the call came from the platform's OPD module or from a legacy OPD system — the authorization contract is the same.

### S14. Tenant-specific authorization customization

Hospital A allows nurses to order routine lab tests (a common practice in primary care). Hospital B restricts lab ordering to doctors only. Both hospitals use the same platform.

**What must happen:**
1. The authorization system supports tenant-specific rules without code changes.
2. Hospital A's administrator configures the permission to allow nurse-initiated lab orders.
3. Hospital B's administrator does not — the base policy restricts it to doctors.
4. A nurse at Hospital A can order labs. The same nurse (if they work at both hospitals) cannot order labs at Hospital B.

### S15. Department head viewing departmental data

The Head of Cardiology at a hospital needs to see all patient encounters, orders, and clinical notes within the Cardiology department — but not data from other departments.

**What must happen:**
1. The system knows this user is the Head of Cardiology (organizational hierarchy data).
2. Authorization evaluates the user's position in the hierarchy against the resource's department.
3. The user sees Cardiology data across all modules (OPD encounters, Lab results, IPD admissions) within their department scope.
4. They do not see Orthopedics data, unless explicitly granted cross-department access.

---

## Integration and interoperability scenarios

### S16. ABDM health record request

An external Health Information User (HIU) requests a patient's health records via ABDM. The request arrives at the platform from ABDM infrastructure.

**What must happen:**
1. The platform receives the inbound request (this is externally initiated, even though data flows "out").
2. The patient's consent is verified against ABDM consent artifacts.
3. The platform collects relevant health records from the applicable modules.
4. Records are formatted as FHIR resources per ABDM profiles.
5. The response is sent back via ABDM infrastructure to the requesting HIU.
6. The entire exchange is logged for audit.

### S17. Legacy HL7v2 lab integration

A hospital's existing legacy lab analyzers send HL7v2 ORM (order) and ORU (result) messages. These need to reach the platform's clinical modules.

**What must happen:**
1. HL7v2 messages arrive at the platform's integration layer.
2. Messages are parsed, validated, and translated into the platform's internal format.
3. Legacy codes (local test codes, local patient IDs) are mapped to platform identifiers.
4. The translated data reaches the appropriate module.
5. Results flow back to the analyzer in HL7v2 format if needed.

### S18. Tenant onboarding

A new hospital signs up for the platform.

**What must happen:**
1. An operator creates the hospital as an organization and provisions a tenant.
2. The system allocates a unique tenant identifier and initializes all tenant-scoped data stores.
3. An initial administrator account is created for the hospital.
4. The hospital's enabled modules, authentication configuration (federated IdP or local), and integration profiles are set.
5. Reference data (drug catalogs, ICD codes, etc.) is made available to the new tenant (global defaults).
6. The hospital administrator can log in and begin configuring their local overrides (formulary, department structure, role assignments).
