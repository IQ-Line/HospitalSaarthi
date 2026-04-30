# 05 — Regulatory and Compliance Requirements

This document lists the regulatory frameworks, standards, and compliance requirements the system must satisfy. These are not optional features — they are conditions of doing business in the Indian healthcare market and specifically conditions of the AIIMS EOI.

---

## 1. ABDM (Ayushman Bharat Digital Mission)

**What it is:** India's national digital health infrastructure, managed by the National Health Authority (NHA). It provides national health IDs (ABHA), health data exchange, consent management, and registries for facilities and professionals.

**What the platform must do:**

- **ABHA integration:** Register patients with ABHA numbers. Link platform patient records to national health IDs. Support ABHA creation, linking, and verification workflows.
- **Health Information Exchange:** Share patient health records with authorized requestors via ABDM's consent-based data sharing framework. This includes receiving requests from external Health Information Users (HIUs) and responding with FHIR-formatted health data.
- **Consent management:** Respect patient consent artifacts managed through ABDM. Only share data when valid consent exists.
- **Facility and professional registries:** Register the healthcare facility and its professionals in ABDM's Health Facility Registry (HFR) and Health Professional Registry (HPR).
- **M3 compliance:** The EOI requires documentary evidence and demonstration of ABDM compliance at minimum M3 level.
- **ABDM workflows must not degrade clinical performance.** The EOI explicitly requires that ABDM integrations maintain latency and uptime SLAs.

**ABDM interaction pattern is bidirectional:** The platform calls ABDM services (outbound), and ABDM/external HIUs call the platform (inbound). Many ABDM flows are externally initiated — an external system requests records, and the platform responds. The integration architecture must handle this bidirectional nature as a first-class concern.

---

## 2. DPDP Act (Digital Personal Data Protection Act, 2023)

**What it is:** India's data protection law, governing the processing of personal data.

**What the platform must do:**

- **Purpose limitation:** Personal health data must be processed only for the stated purpose (clinical care, billing, regulatory compliance). Re-use for other purposes requires explicit consent.
- **Data principal rights:** Patients (data principals) have the right to access their data, correct inaccuracies, and request erasure (subject to medical record retention requirements). The platform must support these operations.
- **Data fiduciary obligations:** The hospital (data fiduciary) must implement reasonable security safeguards, maintain records of processing activities, and report breaches to the Data Protection Board.
- **Consent records:** Maintain auditable records of what consent was given, by whom, when, and for what purpose.
- **Cross-border data transfer:** If cloud infrastructure is outside India, data transfer must comply with DPDP Act provisions on cross-border data flow.

**Tension with medical record retention:** The DPDP Act grants erasure rights, but medical records must be retained per Medical Council of India / NMC guidelines (typically 3-5 years minimum, longer for certain records). The platform must navigate this tension — honoring erasure requests where legally permissible while maintaining retention where legally mandated.

---

## 3. NABH / NABL accreditation requirements

**What they are:** National Accreditation Board for Hospitals and Healthcare Providers (NABH) and National Accreditation Board for Testing and Calibration Laboratories (NABL) set quality standards for hospital and lab operations.

**What the platform must support:**

- **Clinical documentation standards:** Structured records, complete discharge summaries, medication reconciliation documentation.
- **Medication safety:** Drug interaction checking, allergy alerts, controlled substance tracking.
- **Infection control tracking:** Surveillance data collection, outbreak detection reporting.
- **Quality indicators:** Automated calculation and reporting of NABH-required quality metrics.
- **Audit trails:** Complete audit trails for clinical actions, access control events, and data modifications.
- **Credentialing:** Tracking of physician and staff credentials, privileges, and competencies.

---

## 4. JCI (Joint Commission International) standards

**What they are:** International hospital accreditation standards, often pursued by tertiary-care institutions like AIIMS.

**Relevant requirements for the platform:**

- **International Patient Safety Goals (IPSGs):** Two-patient-identifier verification, medication safety, surgical safety checklists, fall risk assessment.
- **Medication management:** Closed-loop medication administration (prescribe → dispense → administer → record), with barcode verification at each step.
- **Unique patient identification:** The platform must support at least two identifiers for patient verification at every care point.
- **Clinical alarm management:** For ICU/telemetry systems, alarm fatigue mitigation through configurable thresholds and escalation workflows.

---

## 5. Health data standards

### 5.1 FHIR R4 (Fast Healthcare Interoperability Resources)

**Why it matters:** The EOI explicitly requires FHIR R4/ABDM profiles. FHIR is the standard for health data exchange at clinical boundaries. ABDM uses FHIR for health record sharing.

**What the platform must do:**
- Expose patient data as FHIR R4 resources at module boundaries.
- Support ABDM FHIR profiles (which extend/constrain base FHIR resources for the Indian context).
- Map internal data models to FHIR resources (the internal model need not be FHIR, but the external contract must be).

### 5.2 HL7v2

**Why it matters:** Most legacy lab analyzers, radiology systems, and older HIS speak HL7v2. The platform must integrate with these systems.

**What the platform must do:**
- Receive and send HL7v2 messages (ADT, ORM, ORU, and others as required).
- Translate between HL7v2 and internal data formats.
- Map legacy codes to standard codes (local lab test codes → LOINC, local drug codes → standard drug catalog entries).

### 5.3 DICOM

**Why it matters:** Medical imaging standard. RIS-PACS integration requires DICOM compliance.

**What the platform must do:**
- Support DICOM communication for radiology workflow (worklist, image storage, image retrieval).
- Integrate with PACS systems for image viewing and reporting.

### 5.4 ICD-10/11, SNOMED CT, LOINC

**Why they matter:** Standardized code systems for diagnoses, clinical terms, and lab observations. Required for interoperability, billing, reporting, and ABDM compliance.

**What the platform must do:**
- Store and serve these code systems as reference data.
- Support tenant-level customization (local naming, formulary subsets) layered on top of the standard code sets.
- Keep code systems updatable (WHO publishes ICD revisions, LOINC is updated periodically).

---

## 6. Infrastructure and security compliance

### 6.1 MeitY cloud guidelines

The EOI requires that cloud infrastructure use MeitY-empanelled Cloud Service Providers. This constrains the cloud provider choices to those approved by the Ministry of Electronics and Information Technology.

### 6.2 Security requirements (from EOI)

- **24x7 Security Operations Centre (SOC):** Continuous security monitoring of all cloud and network components.
- **Privacy Operations Centre (POC):** Monitor access to personal health data, manage consent artifacts, enforce privacy-by-design.
- **CERT-In compliance:** Adherence to Indian Computer Emergency Response Team guidelines for incident reporting and cybersecurity practices.
- **ISO standards:** ISO 27799 (health informatics security), ISO 22600 (access control for health information), ISO 27789 (audit trails for EHR).
- **Security-by-design and privacy-by-design:** Not bolt-on security — the architecture must embed security and privacy from the ground up.
- **PKI (Public Key Infrastructure):** For digital signatures, certificate-based authentication (mTLS), and secure communication.

### 6.3 Disaster recovery

- **Cloud DC + Cloud DR + On-Premises BCP:** Three-environment architecture with defined RTO and RPO.
- **Seamless synchronization** between cloud DC, cloud DR, and on-premises BCP environments.
- **High availability and failover mechanisms.**

---

## 7. Compliance summary matrix

| Requirement | Source | Impact on architecture |
|------------|--------|----------------------|
| ABHA integration and health data exchange | ABDM / EOI | Bidirectional integration layer, FHIR endpoints, consent enforcement |
| Personal data protection and erasure rights | DPDP Act | Data lifecycle management, consent records, retention vs. erasure logic |
| Audit trails for all clinical actions | NABH / JCI / EOI | Pervasive audit logging at authorization, data mutation, and access layers |
| Role-based access control | EOI / NABH | Fine-grained authorization with tenant-specific customization |
| Two-patient-identifier verification | JCI IPSG | Patient identity service must support multiple identifier types |
| Closed-loop medication management | JCI / NABH | Barcode-at-every-step workflow, Pharmacy + Nursing integration |
| FHIR R4 at clinical boundaries | ABDM / EOI | Module boundary contracts in FHIR, translation layer for legacy |
| HL7v2 for legacy integration | Market reality | Protocol translation infrastructure |
| MeitY-approved cloud only | EOI | Cloud provider constraint |
| 24x7 SOC and POC | EOI | Operational infrastructure, monitoring tooling |
| BCP on-premises | EOI | Deployment topology must support on-prem fallback |
