# ADR-0006: Four core platform modules

- **Status:** Proposed
- **Date:** 2026-04-28
- **Deciders:** [Engineering Manager], [Architect]

## Context and problem statement

The HIMS platform separates a small set of "core" modules -- always deployed, always available -- from the ~38 feature modules that hospitals adopt selectively. Core modules provide the platform substrate: identity, patient identity, configuration, and reference data. The Engineering Manager's original architecture identified three core modules (User Management, Configurator, Master & Tenant Data). This ADR evaluates whether EMPI / Patient Identity should be added as a fourth, and whether analytics or audit-log should be promoted to core status. See [HLD 01 section 5](../hld/01-system-overview.md#5-four-core-modules--summary) and [HLD 02 Overview](../hld/02-core-modules.md#overview).

## Decision drivers

- Core modules must be present in every deployment topology -- full platform, fragmented adoption, SaaS, and lite ([HLD 01 section 8](../hld/01-system-overview.md#8-deployment-topologies-summary)).
- The EM's definition of "core" is strict: a module is core only if it is required by every possible module combination. This definition is a valid architectural standard and must be respected honestly.
- Patient identity fragmentation across modules is a documented patient safety risk (AHIMA, 2014). A single patient identity authority prevents duplicate records, identity mismatches, and the resulting clinical errors ([HLD 02 section 2.2](../hld/02-core-modules.md#22-rationale-for-empi-as-a-core-module)).
- ABDM/ABHA compliance requires a single integration point for national health ID linking across all clinical modules.
- The four-plane layer model (Identity, Control, Reference, Operational) provides a clean dependency hierarchy where each plane's failure domain is independent ([HLD 01 section 4](../hld/01-system-overview.md#4-layer-model)).

## Considered options

1. **Three core modules (EM's original)** -- User Management, Configurator, Master & Tenant Data. EMPI is a feature module deployed only when patient-facing modules are adopted.
2. **Four core modules adding EMPI** -- the three above plus EMPI / Patient Identity. EMPI is core for any clinical deployment; omittable only for purely administrative deployments (Building Management, Equipment Maintenance, Academic/Research).
3. **Five+ modules, promoting analytics/audit-log to core** -- the four above plus analytics and/or audit-log as core platform services.

## Decision outcome

Chosen option: **Four core modules adding EMPI**, because every realistic HIMS deployment includes at least one patient-facing module, making a single patient identity authority a hard runtime dependency for the operational plane. Under the EM's strict "required by ALL combos" definition, EMPI does not universally qualify -- a deployment consisting only of Building Management and Equipment Maintenance could technically function without it. We acknowledge this honestly: EMPI is core for any clinical deployment, and omittable only for purely administrative deployments that do not handle patient data. Since the platform is a Hospital Information Management System and no hospital deploys one without patients, this caveat is narrow enough to justify core status.

### Consequences

**Positive:**

- A single, authoritative patient identity service prevents the N-module duplication problem: without EMPI, each of the ~38 clinical modules would independently manage patient records, leading to fragmented identities, duplicates, and reconciliation failures.
- ABDM/ABHA compliance is centralized. The EMPI is the single integration point for linking internal patient IDs to ABHA numbers, satisfying the national health ID mandate without per-module ABHA logic.
- The four-plane model (Identity, Control, Reference, Operational) gives each core module a clear position in the dependency hierarchy: User Management and EMPI in the Identity Plane, Configurator in the Control Plane, Master & Tenant Data in the Reference Plane.
- Cross-system identity linking (platform patient ID to legacy MRN, insurance ID, ABHA) is handled once in the EMPI rather than reimplemented in every module that deals with patients.

**Negative / accepted trade-offs:**

- EMPI adds a hard runtime dependency on the critical path for every patient-facing operation. If EMPI is unavailable, new patient registration fails. Mitigation: modules cache a local projection of recently-accessed patient records and the EMPI is deployed for high availability ([HLD 02 section 2.6](../hld/02-core-modules.md#26-failure-mode-behavior)).
- The EM's strict definition of "core" is not fully satisfied. This is a political as much as a technical trade-off. The honest framing -- "core for clinical deployments, omittable for purely administrative ones" -- must be presented explicitly in the alignment meeting rather than papering over the distinction.
- Four core modules increase the minimum viable deployment footprint compared to three. A fragmented adoption that includes any patient-facing module now requires four core dependencies rather than three.

**Follow-up actions:**

- [ ] Obtain EM sign-off on EMPI's core status with the "core for clinical deployments" framing ([HLD 01 Open Question 2](../hld/01-system-overview.md#1-open-questions)).
- [ ] Produce ADR-0007 detailing EMPI's internal design, deduplication strategy, and ABDM integration.
- [ ] Document the purely-administrative deployment scenario (no EMPI) as a supported but secondary topology.

## Pros and cons of the options

### Three core modules (EM's original)

- *Good:* Strictly satisfies the EM's "core = needed by ALL combos" rule. No asterisks, no caveats.
- *Good:* Smaller minimum deployment footprint -- three always-on services instead of four.
- *Bad:* Patient identity becomes a feature-module concern. Each clinical module that handles patients must either embed its own patient table or depend on a non-core EMPI that may or may not be deployed. This recreates the fragmented identity problem that an EMPI exists to solve.
- *Bad:* ABDM/ABHA linking must be implemented per-module or via a shared library without a canonical data store. Neither approach provides the single source of truth that regulatory compliance demands.
- *Bad:* In a fragmented adoption where a hospital runs OPD and Lab from this platform but IPD from a legacy system, there is no single service to link the platform's patient IDs to the legacy MRNs. The identity-linking problem falls on every module individually.

### Four core modules adding EMPI

- *Good:* Single patient identity authority eliminates duplicate records, identity fragmentation, and per-module dedup logic across ~38 potential clinical modules.
- *Good:* Centralizes ABDM/ABHA integration, cross-system identity linking, and consent-linkage management.
- *Good:* Aligns with the FHIR data model, where Patient is a foundational resource that all clinical resources reference.
- *Good:* Failure-mode design is explicit: EMPI unavailability degrades gracefully for known patients (cached projections) and fails hard only for new registrations, which is the correct behavior.
- *Bad:* Does not strictly satisfy the EM's "ALL combos" definition. Purely administrative deployments could omit it.
- *Bad:* Adds a critical-path dependency for patient-facing operations, increasing the platform's availability requirements.

### Five+ modules, promoting analytics/audit-log to core

- *Good:* Every deployment gets analytics and audit-log capabilities out of the box.
- *Bad:* Analytics and audit-log are downstream consumers, not upstream dependencies. If analytics is unavailable, OPD still registers patients. If EMPI is unavailable, OPD cannot register patients. Promoting consumers to core status inflates the minimum deployment footprint without architectural justification.
- *Bad:* Audit logging is a cross-cutting concern implemented via Cerbos PDP audit logs and event publication, not a separate module that other modules call at runtime. Making it "core" mischaracterizes its role.
- *Bad:* The EM's position on this is correct: core modules are things the operational plane depends on to function, not things that consume from the operational plane.

## Links

- Related ADRs: [ADR-0002](./0002-multi-tenant-fragmentable-adoption.md), [ADR-0007](./0007-empi-dedicated-platform-service.md)
- Related HLD: [System Overview -- four core modules](../hld/01-system-overview.md#5-four-core-modules--summary), [System Overview -- layer model](../hld/01-system-overview.md#4-layer-model), [Core Modules -- overview](../hld/02-core-modules.md#overview), [Core Modules -- EMPI rationale](../hld/02-core-modules.md#22-rationale-for-empi-as-a-core-module)
- External sources:
  - HL7 International, "FHIR R4 Patient Resource", https://hl7.org/fhir/R4/patient.html, accessed 2026-04-28
  - AHIMA, "Managing the Integrity of Patient Identity in Health Information Exchange", 2014 (cited in HLD 02 for patient safety risk of fragmented identity)
