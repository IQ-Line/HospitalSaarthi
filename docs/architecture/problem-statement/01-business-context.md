# 01 — Business Context

This document describes the business environment the HIMS platform must operate in: the AIIMS EOI opportunity, the company's existing product portfolio, and the Indian hospital market.

---

## 1. AIIMS New Delhi — Digital AIIMS EOI

### 1.1 The institution

AIIMS New Delhi is India's apex medical education and healthcare institution. It operates 60+ departments, multiple specialty and super-specialty centers, 21+ central facilities, and satellite campuses (Neurosciences Centre, Cardiothoracic Centre, Jai Prakash Narayan Apex Trauma Center, National Cancer Institute Jhajjar, Mid-Town Rotary Hospital Trilokpuri, and others). It is expanding to approximately 5,000 beds.

Scale in 2024-25:
- 54,25,986 OPD patients (including Casualty)
- 3,92,518 IPD patients
- 3,06,881 surgeries

### 1.2 The EOI scope

The EOI (No. 01/CF/EOI/2025) requests an integrated digital ecosystem covering:

| # | Functional Area | Category |
|---|----------------|----------|
| 1 | Outpatient Management (OPD) | Clinical |
| 2 | Inpatient Management (IPD) | Clinical |
| 3 | Electronic Medical Records (EMR) | Clinical |
| 4 | Emergency Management | Clinical |
| 5 | Appointment Scheduling | Clinical Support |
| 6 | Queue Management System (QMS) | Clinical Support |
| 7 | Operation Theatre / Surgery Management | Clinical |
| 8 | Critical Care (ICU) | Clinical |
| 9 | Vaccination and Immunization | Clinical |
| 10 | Nursing Care | Clinical |
| 11 | Pharmacy | Clinical Support |
| 12 | Clinical Support Services (CSS) | Diagnostics |
| 13 | Endoscopy Labs | Diagnostics |
| 14 | Blood Bank | Diagnostics |
| 15 | Laboratory Information System (LIS) | Diagnostics |
| 16 | Radiology Information System (RIS) | Diagnostics |
| 17 | CSSD (Central Sterile Services Department) | Support |
| 18 | Cath Lab Management | Diagnostics |
| 19 | Diet and Kitchen Management | Support |
| 20 | MIS Reports | Administrative |
| 21 | Billing and Financial Management | Administrative |
| 22 | Insurance & Claims Management | Administrative |
| 23 | Biomedical Equipment Maintenance | Support |
| 24 | Birth Registration | Administrative |
| 25 | Death Registration | Administrative |
| 26 | Issue of Certificates | Administrative |
| 27 | Autopsy Management | Clinical |
| 28 | Ambulance Management | Support |
| 29 | Web Portal (Doctors and Patients) | Digital Front Door |
| 30 | Medico-Legal Case / Report (MLC/MLR) | Clinical |
| 31 | Forensic Medicine and Toxicology | Clinical |
| 32 | Mortuary | Support |
| 33 | E-ICU | Clinical |
| 34 | Academic and Research Information Management | Academic |
| 35 | Building Management | Administrative |
| 36 | Administrative Modules | Administrative |
| 37 | Reports and Analytics | Cross-cutting |
| 38 | AI-Enabled Modules | Cross-cutting |

These are functional groupings, not necessarily individual deployment units. Some may be combined into a single service where they share data models, workflow coupling, or scaling characteristics.

### 1.3 What AIIMS explicitly requires

From the EOI Scope of Work (Section 5):

- **Unified clinical workstation**: Single sign-on, patient-context launch (opening a patient once enables access to all clinical functions), consolidated patient timeline spanning OPD/IPD/Emergency/ICU/OT/diagnostics/pharmacy/MRD.
- **Longitudinal patient record**: Demographics, encounters across all centres, diagnoses, allergies, medications, immunizations, procedures, orders, results, clinical documents. Must work for both migrated modules and non-migrated legacy systems.
- **Integration layer**: API-first integration using HL7 v2.x, FHIR R4/ABDM profiles, DICOM. Integration Hub (ESB/iPaaS or equivalent) to prevent point-to-point sprawl.
- **Master data management**: Departments, services, tariffs, users, locations, assets, catalogue harmonization.
- **Hybrid infrastructure**: On-premises + MeitY-approved cloud. Primary DC in cloud, DR in cloud, BCP on-premises.
- **Mobile-first**: Patient-centric modules must have Android/iOS interfaces with Indian language support, speech-to-text, text-to-speech.
- **AI-driven analytics and intelligent automation**.
- **Performance**: P95 response times for common clinical actions. Peak load testing with 1.5x headroom. Tele-ICU alarm pipelines with end-to-end latency targets.
- **Security operations**: 24x7 SOC and Privacy Operations Centre (POC) for health data access monitoring.

### 1.4 What AIIMS explicitly requires for integration

The EOI states (Section 5.1.9): "AIIMS requires a single integrated ecosystem (not a collection of loosely connected modules)." This is a direct requirement for deep integration, not just module coexistence. The bidder must provide:

- Integration blueprint and target-state architecture
- Interface inventory with specifications and test scripts
- Master data management approach
- Data quality and reconciliation approach for cross-system consistency
- Go-live acceptance criteria for end-to-end clinical scenarios

---

## 2. Company's existing product portfolio

### 2.1 Production HIMS

The company operates a production HIMS (`hims-production`) focused on OPD workflows. It has full ABHA integration and is FT (Facility Type) certified by NHA/ABDM. This is a working, deployed product — not a prototype.

Relevance: The production HIMS proves ABDM compliance capability and provides real-world experience with ABHA flows, patient registration, and OPD workflows. Some code, patterns, or integration logic may be reusable. The deduplication algorithm (phonetically similar name, age ±2 years, same gender, same phone) is a starting point for the new platform's EMPI.

### 2.2 LIMS + RIS-PACS

The company has a Lab Information System and Radiology Information System with PACS. This is a legacy system under active development.

Relevance: If the company already has lab and radiology software, the HIMS platform's integration architecture directly applies to integrating the company's own legacy products. The Integration Hub is not just for external hospitals' legacy systems — it's also for internal product integration.

### 2.3 SMS (School Management System)

A separate product line. Not directly relevant to the HIMS architecture, but indicates the company operates multiple product lines and the engineering team's bandwidth is shared.

---

## 3. Market landscape

### 3.1 Indian hospital diversity

The Indian hospital market spans an enormous range:

| Segment | Size | Typical IT state | Adoption pattern |
|---------|------|-----------------|-----------------|
| Single-doctor clinic | 1-5 beds | Paper or basic billing software | Needs 1-2 modules, minimal infra |
| Standalone pharmacy | N/A | Inventory + billing | Single module |
| District/taluka hospital | 30-200 beds | Partial legacy HIS, some modules | 3-5 modules alongside legacy |
| Private hospital / chain | 100-1000 beds | Mix of legacy and newer systems | Phased migration, some modules at a time |
| Tertiary-care institution (AIIMS) | 2000-5000 beds | Complex legacy landscape | Full platform, high compliance bar |
| Hospital chain (multi-site) | Multiple facilities | Varies per facility | Central platform, per-facility rollout |

### 3.2 The "already have something" problem

Almost every hospital above the single-doctor level already runs some form of information system — whether it's a full legacy HIS, a standalone lab system, a pharmacy inventory tool, or a billing application. The new platform enters an environment of existing systems, not a greenfield.

This means:

- **Day-one interoperability is required.** A hospital adopting the Pharmacy module must be able to receive prescriptions from their existing OPD system on day one.
- **Gradual migration is the norm.** Hospitals will migrate module-by-module over months or years, not in a single cutover.
- **Patient identity fragmentation is the default state.** The same patient will have different IDs in different systems. The platform must handle identity resolution across systems from day one.
- **Data migration is non-trivial.** Historical data from legacy systems must be accessible through the new platform, either via migration or real-time retrieval from legacy.

### 3.3 Stakeholder expectations

**Product/business stakeholders** think in terms of the "whole picture" — they want integration with third-party HIMS systems, standalone capability for single-module deployments, and a commercial product that serves the full range of hospital sizes. They are aware that hospitals need the ability to adopt incrementally.

**Engineering** has focused primarily on the three core modules (User Management, Configurator, Master & Tenant Data) and the clinical modules (OPD, IPD, Lab, etc.). The integration story, patient identity (EMPI), and the implications of fragmented adoption for module boundaries are areas that need further alignment.

Bridging the product vision (whole picture, including integration and standalone capability) with the engineering focus (core modules and clinical workflows) is a key alignment challenge.
