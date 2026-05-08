# ADR-0021: Record Foundation as a fifth core platform module

- **Status:** Proposed
- **Date:** 2026-05-08
- **Deciders:** [Architect], [Engineering Manager], [Co-Tech-Lead]

## Context and problem statement

[ADR-0006](./0006-four-core-platform-modules.md) defined four core platform modules: User Management, EMPI, Configurator, Master Data. [HLD 02 -- Core Platform Modules](../hld/02-core-modules.md) treats those four as the foundation every clinical module depends on. [Module Build Order](../analysis/02-module-build-order.md) places "EMR (Unified View)" in Phase 4 as a late-stage product expansion.

This ADR re-evaluates that placement in light of ABDM/ABHA compliance, which is a **Phase 1 production-parity requirement** ([CEO directive in `project_ceo_directive.md`](../../../../.claude/projects/-home-ayushiqline-projects-draft-The-HIMS/memory/project_ceo_directive.md), [Module Build Order Phase 1](../analysis/02-module-build-order.md#phase-1-opd--billing-core--abdm-feature-parity)).

ABDM Milestones 2 and 3 require the platform to:

1. Discover and enumerate **care contexts** for an ABHA-linked patient ([ABDM Milestone 2 -- Health Records, HIP Link/Discovery/Consent/Transfer](../../../docs/external/abdm/v3-m2-health-records-hip-link-discovery-consent-transfer.md)).
2. Assemble **NRCeS/ABDM-conformant FHIR Document Bundles** when consent permits ([NRCeS FHIR Implementation Guide](https://nrces.in/ndhm/fhir/r4/index.html)).
3. **Receive, decrypt, parse, and store** external FHIR bundles when acting as HIU ([ABDM Milestone 3 -- HIU Consent Request and Health Records Fetch](../../../docs/external/abdm/v3-m3-hiu-consent-request-health-records-fetch.md)).
4. Provide a **timeline view** of the patient's records (internal + external) for the doctor.
5. Honour ABDM's `dataEraseAt` constraint -- received external records must be purged after the consent expiry.

None of the four existing core modules naturally owns these concerns:

- **EMPI** is the patient identity authority. It owns ABHA identifiers, the canonical demographic, dedup, UHID. It does *not* own clinical records, FHIR bundles, or care-context lifecycle. Forcing this into EMPI conflates identity with content. It also makes EMPI the dumping ground for any future longitudinal-record concern.
- **Integration Hub** is the protocol/transport layer ([ADR-0011](./0011-integration-hub-split.md)). Its responsibility is gateway sessions, encryption, FSM-driven choreography, callback routing. Storing clinical bundles inside Integration Hub couples persistent clinical record state to a service whose job is transport. The `abdi-lims-backed` reference implementation does this and pays the cost: ABDM transport bugs and clinical-record concerns share a deployment, schema, and on-call rotation.
- **OPD / future clinical modules** own *their own* source records (visit, prescription, encounter). They do not naturally own a cross-module care-context registry, the immutable FHIR Document vault, or external HIU records authored elsewhere.
- **Master Data** is reference data; it does not own patient-scoped records.

There is also a critical *medico-legal* dimension that the build-order's Phase-4 framing misses. ABDM Milestone 3 exchanges happen via **FHIR Document Bundles** -- bundles headed by a `Composition` resource that represent "a clinical snapshot in time" ([HL7 FHIR R4 -- Composition](https://hl7.org/fhir/R4/composition.html), [HL7 FHIR R4 -- Bundle](https://hl7.org/fhir/R4/bundle.html)). The document is required to be *immutable*: ABDM allows for digital signatures on dispatched bundles, and clinical care-record retention regulations (DPDP Act, NABH 5th Edition standards) require provenance-preserving storage of what was clinically true at a given moment.

A "regenerate-on-the-fly-from-source-tables" approach -- which is the pattern most CRUD-style HIMS implementations would default to -- fails:

- A consultation regenerated 18 months later may produce a different bundle than what was clinically true on the day of the consultation: the prescribing doctor's name may have changed, the hospital may have relocated, an ICD code may have been deprecated, a medication's master entry may have been updated. The *current* state of source tables is no longer the historical state.
- A digitally signed bundle cannot be regenerated; regeneration produces different bytes and invalidates the signature.
- The DPDP Act's purpose-limitation and accuracy obligations require demonstrating *what was disclosed* to a HIU, byte-for-byte. Without an immutable artifact this is impossible.

The agent reviews independently confirmed this position ([agent-reviews/g/fhir-care-context-storage-review.md](../../../agent-reviews/g/fhir-care-context-storage-review.md), [agent-reviews/t/hld-emr-mrd-abdm-care-context-review/review.md](../../../agent-reviews/t/hld-emr-mrd-abdm-care-context-review/review.md)). The production HIMS (`hims-production`'s `abdi-lims-backed`) already stores bundles statically -- not by sophistication, but because anything else fails certification.

The architecture therefore needs a module that owns: (a) the care-context registry, (b) the immutable internal-bundle vault, (c) the external-HIU bundle inbox, (d) the timeline read-model, and (e) the `dataEraseAt` enforcement. None of the existing core modules can absorb this without violating its own boundary. Distributing it across operational modules creates coordination problems for HIP discovery (where do you assemble "all care contexts for this ABHA across OPD + Lab + IPD"?) and creates a dumping ground in Integration Hub.

## Decision drivers

- **Production-parity requires it now, not in Phase 4.** The CEO directive frames Phase 0 + Phase 1 as "re-implement existing HIMS" and the production HIMS holds NHA Facilitation Testing certification. Without an owner for care-context lifecycle and bundle vaulting, ABDM compliance cannot be achieved in Phase 1.
- **Boundary integrity.** EMPI must remain identity-only. Integration Hub must remain transport-only. Operational modules must not own cross-module aggregation.
- **Medico-legal immutability.** FHIR Document Bundles must be stored statically, signed where required, and retained per regulation. This responsibility needs an explicit, named owner.
- **Fragmented adoption** ([ADR-0002](./0002-multi-tenant-fragmentable-adoption.md)). A facility that adopts only Pharmacy + ABDM still needs care-context infrastructure for the ABDM workflows, even though it has no OPD module.
- **Phasing realism.** The full clinical EMR product (rich UI, specialty templates, AI summaries, deep MRD integration) is correctly Phase 4. The *substrate* the EMR product will sit on is needed in Phase 1.
- **Scaffolding effort is bounded.** The Phase 1 v1 of Record Foundation is small (4-5 tables, ~20 endpoints). It is not the full EMR product.

## Considered options

1. **Status quo: defer all record-foundation concerns to Phase 4 EMR module.** ABDM Phase 1 work absorbs care-context state inside Integration Hub.
2. **Absorb care contexts into EMPI.** Treat care-context registry as an extension of patient identity.
3. **Distribute care-context responsibility across operational modules.** Each clinical module (OPD, Lab, IPD) maintains its own care-context registry; ABDM discovery aggregates by calling each.
4. **Create Record Foundation as a fifth core platform module**, scoped to: care-context registry, immutable internal bundle vault, external HIU bundle inbox, timeline read-model, erasure enforcement. Future Phase 4 EMR product is a distinct, richer module that builds on Record Foundation.

## Decision outcome

Chosen option: **Create Record Foundation as a fifth core platform module.**

Record Foundation is recognised as an *Operational Core Module* in [HLD 02](../hld/02-core-modules.md), alongside the existing four. It is built in **Phase 1** alongside OPD and the ABDM Adapter, with its data model finalised as a **Phase 0 exit criterion**. The Phase 4 "EMR (Unified View)" remains in the build order as the *product* layer (rich timeline UX, specialty templates, AI summaries, advanced document workflows) -- it does not replace Record Foundation; it sits on top of it.

EMPI remains identity-only. Integration Hub remains transport-only. Operational modules own their source records and emit `*.finalized` events with FHIR resources attached. Record Foundation orchestrates Composition assembly, vaults the immutable bundle, and registers the care context.

### Consequences

**Positive:**

- ABDM compliance is structurally achievable in Phase 1. The HIP "discover care contexts" call has an obvious destination: `GET /care-contexts?patient_id=X`. The HIP "fetch bundle for context Y" call has an obvious destination: `GET /care-contexts/Y/fhir-bundle`.
- Each module retains a clean boundary. EMPI is identity. Integration Hub is transport. OPD owns OPD visits. Record Foundation owns the cross-module clinical record substrate.
- Immutability is enforced by table design (the bundle vault tables have no `UPDATE` path on the bundle bytes; only insertion and erasure).
- Future EMR product has a clear seam. The Phase 4 EMR consumes Record Foundation's APIs; it does not need to redo the care-context substrate.
- Fragmented-adoption deployments work cleanly. A pharmacy-only deployment still has Record Foundation available for its ABDM care-context discovery, even though no OPD source module is present.
- The medico-legal posture matches the existing certified production system (where bundles are statically stored), so re-certification of the rebuilt ABDM stack is structurally easier.
- Aligns with both independent agent reviews ([t](../../../agent-reviews/t/hld-emr-mrd-abdm-care-context-review/review.md), [g](../../../agent-reviews/g/fhir-care-context-storage-review.md)).

**Negative / accepted trade-offs:**

- One more service in Phase 1. Adds operational scope (one more deployment, one more schema, one more on-call surface).
- The line between "Phase 1 Record Foundation" and "Phase 4 EMR product" must be policed. Without discipline, Record Foundation can absorb feature creep that should belong to the Phase 4 EMR. Mitigation: the LLD's scope section explicitly enumerates what Record Foundation *does not* do (rich UI, specialty templates, deficiency workflow).
- Some teams may interpret "fifth core module" as scope expansion. Mitigation: the v1 Record Foundation has 4-5 tables and a small endpoint surface. It is core because of *position* in the dependency graph, not because of size.
- A new event contract is needed: `record-foundation.care-context.registered`, `record-foundation.bundle.stored`, `record-foundation.external-record.received`, `record-foundation.bundle.erased`. These are documented in `specs/events/record-foundation.events.yaml` (target file).

**Follow-up actions:**

- [ ] Update [HLD 02 -- Core Platform Modules](../hld/02-core-modules.md) to include Record Foundation as the fifth core module with its own section.
- [ ] Update [HLD 05 -- Integration and Interop, section 4 (ABDM)](../hld/05-integration-and-interop.md#4-abdmabha-integration) to reflect that Record Foundation -- not Integration Hub -- owns clinical record persistence.
- [ ] Update [Module Build Order](../analysis/02-module-build-order.md): Phase 0 adds Record Foundation data-model agreement to exit criteria; Phase 1 adds Record Foundation v1 alongside OPD, Billing core, and ABDM Adapter.
- [ ] Define the data model in [Record Foundation LLD](../lld/record-foundation/01-schema-design.md).
- [ ] Define `record-foundation.events.yaml` event contract.
- [ ] Confirm the module name `record-foundation` and the schema name `record_foundation` (locked in this ADR).
- [ ] Distinguish Record Foundation v1 (Phase 1, substrate) from EMR product (Phase 4, rich UI / specialty workflows / AI summaries) in build order and ADR-0006 follow-up.

### Why "Record Foundation" and not "EMR" or "Health Records"

The name signals *substrate*, not *product*. "EMR" is reserved for the Phase 4 user-facing product. "Health Records" is too close to the FHIR resource term `HealthRecord` and risks confusion with the immutable FHIR document the module stores. "Clinical Records" is acceptable but does not communicate the substrate-vs-product distinction. The agent reviews offer "Record Foundation", "EMR Foundation", "Clinical Record", "Health Record Service" as candidates; this ADR commits to **Record Foundation** because it is unambiguous and because its presence as a *foundation* (sibling of EMPI, User Management, Configurator, Master Data, Integration Hub) is precisely the position the architecture needs.

### Boundary against the four existing core modules

| Concern | Owned by | Not owned by |
|---|---|---|
| Patient identity, ABHA number/address linkage, dedup, UHID | **EMPI** | Record Foundation |
| Tenant configuration, ABDM credentials, HFR facility ID | **Configurator** | Record Foundation |
| Module/feature/permission registry, healthcare reference data | **Master Data** | Record Foundation |
| Authentication, role assignment, JWT issuance | **User Management** | Record Foundation |
| Care-context registry per patient | Record Foundation | -- |
| Immutable internal FHIR Document Bundle vault | Record Foundation | OPD, Lab, IPD (they emit FHIR resources but do not store the assembled Document) |
| External HIU bundle inbox | Record Foundation | Integration Hub (transport only) |
| Timeline read-model for doctor view | Record Foundation | Phase 4 EMR product (consumes the read-model) |
| `dataEraseAt` enforcement / scheduled erasure | Record Foundation | Integration Hub |
| ABDM session state, gateway tokens, FSM workflows, consent artifacts | **Integration Hub** | Record Foundation |
| FHIR resource serialisation for a domain | The owning operational module (OPD for OPConsultRecord etc.) | Record Foundation (it composes; it does not invent resources) |

## Pros and cons of the options

### Status quo (defer to Phase 4 EMR; absorb in Integration Hub for now)

- *Good:* No new module in Phase 1.
- *Bad:* Integration Hub becomes a clinical record store. Transport bugs and clinical record concerns share a deployment, on-call rotation, and schema. The `abdi-lims-backed` precedent demonstrates this is a real operational pain point.
- *Bad:* The "regenerate from source tables" trap is still present: Phase 4 EMR may not arrive in time to fix it, and the Phase 1 ABDM work would have to re-architect when Phase 4 lands.
- *Bad:* Misses the immutability requirement. Bundles stored inside Integration Hub for the convenience of M3 transport are not naturally retained per medico-legal rules.

### Absorb care contexts into EMPI

- *Good:* Patients and their care contexts share a primary key. Single-module simplicity.
- *Bad:* EMPI's purpose is identity. Adding clinical records, FHIR bundles, and external HIU inbox conflates two separate authorities. EMPI's API surface and on-call scope balloons.
- *Bad:* Future Phase 4 EMR has no clean substrate; it has to either fork from EMPI or pull EMPI in as a clinical-record provider.
- *Bad:* Cross-module concerns (assembling care contexts from OPD + Lab + IPD) sit awkwardly in an identity module.

### Distribute care-context responsibility across operational modules

- *Good:* Each module owns its data end-to-end.
- *Bad:* ABDM discovery (`GET all care contexts for ABHA X`) requires fanning out to every clinical module. With ~10+ clinical modules at full EOI scope, this becomes a coordination problem that Integration Hub must orchestrate -- pushing clinical-record-aggregation logic into a transport service.
- *Bad:* No single owner for external HIU bundles. They do not belong to any operational module (the records were authored elsewhere).
- *Bad:* Each operational module re-implements the same FHIR Composition assembly logic, the same immutability discipline, and the same `dataEraseAt` enforcement. The DRY violation is large.
- *Bad:* MRD-style aggregation (Phase 3+) and Phase 4 EMR have no place to point at; they have to fan-out themselves.

### Record Foundation as fifth core platform module

- *Good:* Each existing module retains its boundary.
- *Good:* ABDM compliance has a clear destination for care-context lifecycle and bundle vaulting in Phase 1.
- *Good:* Future Phase 4 EMR has a clean substrate to consume.
- *Good:* Fragmented adoption is structurally enabled (Record Foundation is a core module, available in any deployment combination).
- *Good:* Mirrors the (re-validated) production HIMS pattern of static FHIR storage, easing re-certification of ABDM compliance.
- *Bad:* One more service to deploy and operate.
- *Bad:* Requires policing the boundary against the Phase 4 EMR product.

## Links

- Related ADRs:
  - [ADR-0006 -- Four core platform modules](./0006-four-core-platform-modules.md) -- this ADR effectively expands that to five
  - [ADR-0007 -- EMPI dedicated platform service](./0007-empi-dedicated-platform-service.md) -- justifies why EMPI cannot absorb care contexts
  - [ADR-0010 -- FHIR / HL7 interop standards](./0010-fhir-hl7-interop-standards.md) -- the FHIR R4 baseline this ADR builds on
  - [ADR-0011 -- Integration Hub split](./0011-integration-hub-split.md) -- justifies why Integration Hub cannot absorb clinical records
  - [ADR-0022 -- Immutable FHIR Document Bundles for ABDM](./0022-immutable-fhir-document-storage.md) -- the immutability discipline Record Foundation enforces
- Related HLD: [HLD 02 -- Core Platform Modules](../hld/02-core-modules.md), [HLD 05 -- Integration and Interop, section 4](../hld/05-integration-and-interop.md#4-abdmabha-integration)
- Related LLD: [Record Foundation LLD](../lld/record-foundation/01-schema-design.md) (target document)
- Agent reviews:
  - [agent-reviews/t -- HLD EMR/MRD/ABDM care-context review](../../../agent-reviews/t/hld-emr-mrd-abdm-care-context-review/review.md)
  - [agent-reviews/g -- FHIR / care-context storage review](../../../agent-reviews/g/fhir-care-context-storage-review.md)
- External sources:
  - HL7 International, "FHIR R4 -- Document Bundle", https://hl7.org/fhir/R4/documents.html, accessed 2026-05-08 -- the immutable-document semantics that Record Foundation honours
  - HL7 International, "FHIR R4 -- Composition resource", https://hl7.org/fhir/R4/composition.html, accessed 2026-05-08
  - National Resource Centre for EHR Standards (NRCeS), "ABDM FHIR Implementation Guide R4", https://nrces.in/ndhm/fhir/r4/index.html, accessed 2026-05-08 -- the profile registry Record Foundation validates against
  - National Health Authority, "ABDM Milestone 2 -- Health Records, HIP Link/Discovery/Consent/Transfer", https://sandbox.abdm.gov.in/sandbox/v3/new-documentation, accessed 2026-05-08 (extracted at [docs/external/abdm/v3-m2-health-records-hip-link-discovery-consent-transfer.md](../../../docs/external/abdm/v3-m2-health-records-hip-link-discovery-consent-transfer.md))
  - National Health Authority, "ABDM Milestone 3 -- HIU Consent Request and Health Records Fetch", https://sandbox.abdm.gov.in/sandbox/v3/new-documentation, accessed 2026-05-08 (extracted at [docs/external/abdm/v3-m3-hiu-consent-request-health-records-fetch.md](../../../docs/external/abdm/v3-m3-hiu-consent-request-health-records-fetch.md))
  - Government of India, "Digital Personal Data Protection Act, 2023", https://www.meity.gov.in/writereaddata/files/Digital%20Personal%20Data%20Protection%20Act%202023.pdf, sections 6 (consent) and 11 (right to erasure) -- the legal basis for `dataEraseAt` enforcement
  - National Accreditation Board for Hospitals & Healthcare Providers (NABH), 5th Edition standards, "Information Management System" chapter -- record retention and provenance requirements
