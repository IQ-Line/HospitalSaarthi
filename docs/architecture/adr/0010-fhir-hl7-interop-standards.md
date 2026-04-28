# ADR-0010: FHIR/HL7 as interop standards

- **Status:** Proposed
- **Date:** 2026-04-28
- **Deciders:** [Engineering Manager], [Architect]

## Context and problem statement

The HIMS platform operates within the Indian healthcare ecosystem, which mandates ABDM (Ayushman Bharat Digital Mission) compliance for health data exchange and includes a large installed base of legacy systems communicating via HL7v2. The platform must exchange clinical data with sibling modules, external hospitals, ABDM/NHA registries, insurance providers, lab analyzers, and radiology systems. The architecture must choose an interoperability standard that satisfies regulatory requirements, serves the existing ecosystem, and does not constrain modules' internal data models. See [HLD 05 -- Integration and Interop, section 5](../hld/05-integration-and-interop.md#5-fhirhl7-boundary-contracts) and [HLD 03 -- Module Shape Template, section 9](../hld/03-module-shape-template.md#9-fhirhl7-boundaries).

## Decision drivers

- **ABDM compliance** -- ABDM mandates FHIR R4 for health information exchange. The platform must produce and consume FHIR R4 bundles to participate as a Health Information Provider (HIP) and Health Information User (HIU) in the ABDM ecosystem ([HLD 05 section 4](../hld/05-integration-and-interop.md#4-abdmabha-integration)).
- **Legacy ecosystem reality** -- lab analyzers, PACS/RIS systems, and many legacy HIS installations in India communicate via HL7v2 messages (ADT, ORM, ORU). Ignoring HL7v2 means the platform cannot integrate with the equipment and systems hospitals already own ([HLD 05 section 5.2](../hld/05-integration-and-interop.md#52-hl7v2-for-legacy-integrations)).
- **Internal model freedom** -- clinical modules have domain-specific access patterns that do not align with FHIR's resource model. A Pharmacy module optimized for dispensation queue throughput should not be forced to store data as FHIR MedicationDispense resources internally ([HLD 05 section 5.3](../hld/05-integration-and-interop.md#53-fhir-resources-are-the-interop-contract-not-the-internal-data-model)).
- **Fragmented adoption interop** -- in a fragmented deployment, module boundaries are also the boundary between the platform and the legacy HIS. The same FHIR/HL7 interface that serves external systems also serves the Integration Hub when bridging to legacy ([HLD 01 section 2.3](../hld/01-system-overview.md#23-the-central-constraint-fragmented-adoption)).
- **Single interface for internal and external consumers** -- a Lab module exposing results as FHIR DiagnosticReport serves the OPD module, the patient portal, a partner hospital, and ABDM through the same interface. This eliminates the cost of maintaining parallel internal and external APIs ([HLD 03 section 7.2](../hld/03-module-shape-template.md#2-fhir-r4-at-clinical-boundaries)).

## Considered options

1. **Proprietary JSON APIs only** -- modules expose custom JSON APIs with platform-specific schemas. External interoperability is handled by building one-off adapters for each external system.
2. **FHIR R4 at clinical boundaries + HL7v2 for legacy** -- clinical modules expose FHIR R4 resources at their API boundaries as the interoperability contract. HL7v2 is supported for legacy integrations, handled by the Integration Hub's translation layer. Modules store data internally in whatever schema suits their domain and translate to/from FHIR at the boundary.
3. **Full FHIR-native data model (store FHIR resources directly)** -- modules use FHIR R4 resources as both the interop contract and the internal storage format. The database stores FHIR resources natively (e.g., in a FHIR-native database or as JSON documents matching the FHIR schema).

## Decision outcome

Chosen option: **FHIR R4 at clinical boundaries + HL7v2 for legacy**, because it satisfies ABDM compliance and healthcare ecosystem interoperability without constraining how modules store and query their data internally. Full FHIR-native storage imposes a rigid resource model on modules that have performance-critical access patterns incompatible with FHIR's structure. Proprietary-only APIs would require ABDM-specific translation layers and one-off adapters for every external system, duplicating work that FHIR standardizes.

### Consequences

**Positive:**

- ABDM compliance is architecturally built in. Clinical modules produce FHIR R4 bundles (Patient, Encounter, DiagnosticReport, MedicationDispense, etc.) as part of their standard API surface. When ABDM requests health records, the platform responds with the same FHIR resources it already exposes -- no separate ABDM-specific translation layer is needed.
- Module teams retain full control over their internal data models. The Pharmacy module can use normalized relational tables optimized for dispensation queue queries. The Lab module can use a schema optimized for result workflows. The FHIR mapping lives at the boundary layer, not in the storage model.
- The existing HL7v2 ecosystem (lab analyzers, PACS bridges, legacy HIS) is supported through the Integration Hub's translation engine, which handles HL7v2 parsing and FHIR-HL7v2 bidirectional mapping. Module teams never write HL7v2 parsing code; that complexity is centralized in the Integration Hub.

**Negative / accepted trade-offs:**

- Every clinical module must implement a FHIR boundary mapping layer. This is non-trivial engineering work: mapping internal domain models to FHIR resources (and back for inbound FHIR), validating against FHIR profiles, handling FHIR search parameters. The platform SDK should provide helpers and a mapping framework, but the domain-specific mapping logic is each module team's responsibility.
- Two representations of the same data (internal model + FHIR boundary) create a maintenance surface. When a module's internal model changes, the FHIR mapping must be updated. When FHIR profiles evolve (e.g., ABDM publishes new profile requirements), the mapping must be updated. This dual-maintenance cost is the price of internal model freedom.
- HL7v2 translation is a specialized skill. The Integration Hub team must understand HL7v2 message structures, segment semantics, and vendor-specific variations. This knowledge is scarce but concentrated in one team (the Integration Hub team), not distributed across all module teams.

**Follow-up actions:**

- [ ] Define the FHIR profile set for each clinical module (which FHIR resources, which profiles, which extensions) as part of the module's LLD.
- [ ] Build FHIR mapping framework utilities in the platform SDK to reduce boilerplate in boundary-layer implementations.
- [ ] Catalogue the HL7v2 message types required for integration with common lab analyzers and radiology systems deployed in Indian hospitals.
- [ ] Validate the FHIR boundary design against ABDM's Facilitation Testing requirements to ensure the platform's FHIR output meets NHA expectations.

## Pros and cons of the options

### Proprietary JSON APIs only

- *Good:* Maximum flexibility. Module teams design APIs exactly for their consumers' needs without conforming to an external standard.
- *Good:* No FHIR learning curve. Teams work with familiar JSON schemas.
- *Bad:* ABDM compliance requires FHIR R4. Without FHIR at the module boundary, a separate ABDM translation layer must be built and maintained. This layer duplicates the work of mapping internal models to FHIR -- the same work that the boundary-FHIR approach does once.
- *Bad:* Every external integration requires a bespoke adapter. A partner hospital using FHIR needs an adapter. A state health authority expecting FHIR bundles needs an adapter. The cost of one-off adapters scales linearly with the number of external systems.
- *Bad:* No ecosystem leverage. Healthcare vendors, consultants, and interop tools understand FHIR. Proprietary APIs cannot benefit from this ecosystem.

### FHIR R4 at clinical boundaries + HL7v2 for legacy

- *Good:* ABDM compliance is structural -- FHIR bundles are a natural output of the module's API, not a bolted-on translation.
- *Good:* Internal model freedom -- modules optimize storage for their domain while presenting a standardized external face.
- *Good:* Single interface for internal and external consumers. The Lab module's FHIR DiagnosticReport endpoint serves the OPD module, the patient portal, partner hospitals, and ABDM alike.
- *Good:* HL7v2 support is centralized in the Integration Hub, not scattered across module codebases. Module teams are shielded from HL7v2 complexity.
- *Bad:* FHIR boundary mapping is non-trivial per-module work. Each clinical module must invest in mapping logic, FHIR validation, and profile conformance.
- *Bad:* Dual representation (internal + FHIR) is a maintenance surface that must be kept in sync.

### Full FHIR-native data model (store FHIR resources directly)

- *Good:* Zero mapping overhead. The internal model IS the FHIR model. What is stored is what is served.
- *Good:* FHIR search comes "for free" if using a FHIR-native database (e.g., HAPI FHIR Server, Google Cloud Healthcare API).
- *Bad:* FHIR's resource model is designed for interoperability, not for operational queries. A Pharmacy module that needs to query "all pending dispensations for this department, ordered by priority, with drug interaction flags" faces an impedance mismatch with FHIR's resource-oriented structure. Operational queries become expensive or require denormalized FHIR extensions that defeat the purpose of standardization.
- *Bad:* Locks modules to a single data model paradigm. A module that would benefit from a graph model, a time-series model, or a highly normalized relational model cannot use one.
- *Bad:* FHIR-native databases (HAPI FHIR JPA Server, etc.) are significantly less mature and performant than PostgreSQL for the access patterns typical of hospital operational systems. Adopting one as the primary data store introduces infrastructure risk.
- *Bad:* Module teams must understand FHIR deeply to write business logic, not just boundary code. This raises the skill bar for every developer on every module team, not just the interop specialists.

## Links

- Related ADRs: [ADR-0008](./0008-module-shape-and-boundaries.md), [ADR-0009](./0009-event-driven-inter-module-communication.md), [ADR-0011](./0011-integration-hub-split.md)
- Related HLD: [Integration and Interop -- section 5](../hld/05-integration-and-interop.md#5-fhirhl7-boundary-contracts), [Module Shape Template -- section 9](../hld/03-module-shape-template.md#9-fhirhl7-boundaries), [System Overview -- section 3.1](../hld/01-system-overview.md#31-standards-based-interop-at-clinical-boundaries)
- External sources:
  - HL7 International, "FHIR R4 Specification", https://hl7.org/fhir/R4/, accessed 2026-04-28
  - National Health Authority (India), "ABDM Health Data Standards and Specifications", https://abdm.gov.in/, accessed 2026-04-28 -- mandates FHIR R4 for health information exchange in the ABDM ecosystem
