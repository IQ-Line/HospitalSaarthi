# ADR-0007: EMPI as a dedicated platform service

- **Status:** Proposed
- **Date:** 2026-04-28
- **Deciders:** [Engineering Manager], [Architect]

## Context and problem statement

The HIMS platform must manage patient identity across up to ~38 functional modules, many of which independently handle patient data (OPD, IPD, Emergency, Lab, Radiology, Pharmacy, Billing, and others). In fragmented adoption scenarios, the platform's modules coexist with legacy systems that use their own patient identifiers (MRN, insurance ID, ABHA). The question is how patient identity is owned, resolved, and deduplicated: embedded per module, shared as a table without a service, or centralized in a dedicated EMPI platform service. See [HLD 02 section 2](../hld/02-core-modules.md#2-empi--patient-identity) and [HLD 01 section 5.2](../hld/01-system-overview.md#52-empi--patient-identity).

This is the most politically sensitive of the proposed architecture decisions. The EM's original core module list did not include EMPI; it was added during architecture conversations with conversational consensus but without formal sign-off. The rationale must be strong enough to survive the alignment meeting.

## Decision drivers

- Patient identity fragmentation across N independent modules creates duplicate records and identity mismatches -- a documented patient safety risk (AHIMA, 2014). The risk scales with the number of modules handling patient data ([HLD 02 section 2.2, point 1](../hld/02-core-modules.md#22-rationale-for-empi-as-a-core-module)).
- ABDM compliance requires linking patients to their ABHA (Ayushman Bharat Health Account) number. The DPDP Act requires identifying which records belong to which individual for consent and data-subject rights. Both demand a single patient identity authority ([HLD 02 section 2.2, point 4](../hld/02-core-modules.md#22-rationale-for-empi-as-a-core-module)).
- Fragmented adoption means modules coexist with legacy systems that use their own patient identifiers. Cross-system identity linking (platform patient ID to legacy MRN, ABHA, insurance ID) must be centralized or every module independently implements it ([HLD 02 section 2.2, point 3](../hld/02-core-modules.md#22-rationale-for-empi-as-a-core-module)).
- The FHIR R4 data model treats Patient as a foundational resource referenced by all clinical resources. A dedicated service that owns the Patient resource aligns with the FHIR resource ownership model ([HL7 FHIR Patient](https://hl7.org/fhir/R4/patient.html)).
- The production HIMS (`hims-production`) already implements a deduplication algorithm aligned with ABDM/NHA rules: phonetically similar name, age within plus or minus 2 years, same gender, same phone number. This algorithm must be owned by a single service, not reimplemented per module.

## Considered options

1. **Patient identity embedded in each clinical module** -- every module that handles patients maintains its own patient table, its own registration workflow, and its own identity-linking logic.
2. **Shared patient table without a dedicated service** -- a common `patients` table in a shared schema, accessed directly by all modules. No dedicated service; modules read/write the table via a shared data-access library.
3. **Dedicated EMPI platform service** -- a separate, independently deployed service that owns canonical patient records, identity resolution, deduplication, and cross-system identity linking. Other modules hold read-only local projections synced via events.

## Decision outcome

Chosen option: **Dedicated EMPI platform service**, because patient identity resolution, deduplication, and cross-system identity linking are complex enough to warrant a single authoritative service, and because distributing this logic across ~38 modules would create the exact fragmentation problem that enterprise MPIs exist to solve. The EMPI is required infrastructure for any clinical deployment -- every clinical module depends on a single patient identity authority, and the technical case for a dedicated service is strong regardless of how the organizational "core module" label is applied. Whether EMPI is formally classified as a core module is the EM's call; this ADR proposes it as a dedicated platform service and recommends core status based on the arguments below. The EMPI owns the canonical patient record; all other modules hold local projections and reference the EMPI's `patient_id` as their foreign key to the patient.

### Consequences

**Positive:**

- Single source of truth for "who is this patient" across the entire platform and across fragmented deployments where different modules may have been adopted at different times. Eliminates the N-module duplication problem.
- Deduplication logic (starting with the ABDM/NHA algorithm: phonetically similar name, age plus or minus 2 years, same gender, same phone) lives in one place. As matching algorithms evolve (toward probabilistic Fellegi-Sunter models), only the EMPI changes -- module code is unaffected.
- Cross-system identity linking (internal `patient_id` to ABHA number, legacy MRN, insurance policy ID) is centralized with full provenance tracking. The Integration Hub translates between platform IDs and external IDs by calling the EMPI's cross-reference API.
- Merge and split operations are auditable and reversible, with `patient.merged` events propagated to all modules holding projections. This is a hard problem that a shared table without a service cannot manage (who runs the merge logic? who publishes the event?).
- FHIR Patient endpoint is exposed by the EMPI, giving external systems a standards-based way to query patient identity.

**Negative / accepted trade-offs:**

- The EMPI is on the critical path for every patient-facing operation. New patient registration, patient search by name/phone/ABHA, and identity verification all require the EMPI to be available. Mitigation: modules cache local projections of recently-accessed patients and the EMPI is deployed with high availability (multiple replicas, health checks). For known patients already in the module's projection, the EMPI is not called on every request ([HLD 02 section 2.6](../hld/02-core-modules.md#26-failure-mode-behavior)).
- The worst-case scenario -- a new patient arriving at Emergency when the EMPI is down -- requires a clinical fallback (paper-based registration with retroactive electronic registration and post-hoc dedup). This is a hospital SOP, not an architecture decision, but the architecture must support retroactive registration and post-hoc deduplication, which adds complexity to the EMPI's merge workflow.
- The EM has not formally signed off on EMPI's classification as a core module. This ADR presents the technical case for a dedicated platform service and recommends core status; the alignment meeting must resolve the organizational label.

**Follow-up actions:**

- [ ] Obtain EM sign-off on EMPI's classification -- this ADR recommends core status; the EM decides the label (see [ADR-0006](./0006-four-core-platform-modules.md) for the "core for clinical deployments" framing).
- [ ] Define the EMPI deduplication algorithm's initial implementation scope: ABDM/NHA rule as baseline, probabilistic matching as a future phase ([HLD 01 Open Question 6](../hld/01-system-overview.md#1-open-questions)).
- [ ] Specify the EMPI's FHIR Patient endpoint contract for ABDM integration.
- [ ] Define the local patient projection sync mechanism (event-driven, schema and TTL).

## Pros and cons of the options

### Patient identity embedded in each clinical module

- *Good:* No new service dependency. Each module is fully self-contained for patient management.
- *Good:* No single point of failure for patient identity -- if one module's patient table is corrupted, others are unaffected.
- *Bad:* The same patient accumulates multiple records across modules. A patient registered at OPD with a slight name variation appears as a different person in Lab. Deduplication across N independent patient tables is exponentially harder than deduplication in one.
- *Bad:* ABDM/ABHA linking must be implemented independently in every module that handles patients. Each module must maintain its own ABHA-to-patient mapping, its own consent-linkage tracking, and its own data-subject request handling.
- *Bad:* In fragmented adoption, there is no service to link the platform's patient IDs to a legacy system's MRNs. Every module needs its own identity-linking logic, and they will inevitably diverge.
- *Bad:* Patient merge (when two records are discovered to be the same person) must be coordinated across all modules holding patient data, with no central authority to drive the workflow.

### Shared patient table without a dedicated service

- *Good:* Single patient record, avoiding cross-module duplication.
- *Good:* No network hop for patient lookups -- modules query the shared table directly.
- *Bad:* Violates the per-module data ownership constraint ([HLD 01 section 3.2](../hld/01-system-overview.md#32-per-module-data-ownership)). A shared table means shared schema ownership, which means coordinated schema migrations across all modules that use the table. This is the tightest possible coupling.
- *Bad:* No clear owner for deduplication logic, merge workflows, or cross-system identity linking. These operations require business logic (matching algorithms, confidence scoring, merge provenance) that does not belong in a data-access library.
- *Bad:* No event publication on patient lifecycle changes. Without a service, there is no natural place to publish `patient.created`, `patient.merged`, or `patient.identity-linked` events. Modules that need to react to patient changes would need to poll the shared table or implement their own change-detection logic.
- *Bad:* Does not support fragmented deployment. If a hospital runs only Pharmacy from this platform and uses a legacy OPD, the shared table has no owner, no API, and no way to receive patient registrations from the legacy system.

### Dedicated EMPI platform service

- *Good:* Single authoritative source for patient identity, resolving the N-module duplication problem.
- *Good:* Owns deduplication logic, merge workflows, cross-system identity linking, and FHIR Patient resource exposure -- all in one place with clear ownership.
- *Good:* Publishes patient lifecycle events (`patient.created`, `patient.updated`, `patient.merged`, `patient.identity-linked`) that other modules consume to maintain their local projections.
- *Good:* Supports fragmented deployment: the EMPI provides an API and event stream that both platform modules and the Integration Hub (on behalf of legacy systems) use to interact with patient identity.
- *Good:* Aligns with established enterprise MPI patterns and with FHIR's treatment of Patient as a foundational resource.
- *Bad:* Hard runtime dependency on the critical path. EMPI unavailability blocks new patient registration.
- *Bad:* Adds operational overhead: a separate service to deploy, monitor, scale, and maintain.
- *Bad:* Local patient projections in consuming modules introduce eventual consistency -- a patient updated in the EMPI is not immediately updated in all modules' caches.

## Links

- Related ADRs: [ADR-0002](./0002-multi-tenant-fragmentable-adoption.md), [ADR-0006](./0006-four-core-platform-modules.md), [ADR-0012](./0012-multi-tenancy-isolation-strategy.md)
- Related HLD: [Core Modules -- EMPI / Patient Identity](../hld/02-core-modules.md#2-empi--patient-identity), [Core Modules -- EMPI rationale](../hld/02-core-modules.md#22-rationale-for-empi-as-a-core-module), [System Overview -- EMPI summary](../hld/01-system-overview.md#52-empi--patient-identity)
- External sources:
  - HL7 International, "FHIR R4 Patient Resource", https://hl7.org/fhir/R4/patient.html, accessed 2026-04-28
  - National Health Authority (NHA), ABDM Health Data Management Policy, https://abdm.gov.in/, accessed 2026-04-28
  - Just, B.H., Marc, D., Munns, M., Sandefer, R., "Why Patient Matching Is a Challenge: Research on Master Patient Index (MPI) Data Discrepancies in Key Identifying Fields", *Perspectives in Health Information Management*, Spring 2016 (enterprise MPI literature on identity resolution complexity)
