# `@hims/ts-sdk-fhir`

Shared FHIR R4 + NRCeS profile primitives for the HIMS platform. Pure transformation code: no I/O, no DB, no HTTP.

> Status: v0.1.0 — builders, structural profile checks, and RFC 8785 canonical JSON are implemented. Full NRCeS IG validation remains a CI concern (HL7 Validator).
>
> See [ADR-0023 — Distributed FHIR assembly](../../docs/architecture/adr/0023-distributed-fhir-assembly.md) for the rationale and the work split between this SDK, clinical modules, and Record Foundation.

## Purpose

Per ADR-0023, FHIR Document assembly is **distributed**:

- Each clinical module (OPD, Lab, Pharmacy, IPD, ...) owns the serialisation of its own domain rows into FHIR resources.
- **Record Foundation** owns Composition assembly, profile validation, and immutable byte-exact storage.
- Both consumers depend on this SDK for the heavy primitives.

This package provides:

- **Resource type definitions** for the FHIR R4 subset the platform uses.
- **NRCeS profile registry** — pinned canonical URLs and versions for each profile the platform produces (OpConsultRecord, Prescription, DischargeSummary, DiagnosticReport, HealthDocumentRecord, ImmunizationRecord, WellnessRecord).
- **Resource builders** (`buildEncounter`, `buildMedicationRequest`, `buildComposition`, `buildDocumentBundle`, ...) — pure functions that take a typed input and return a FHIR resource.
- **Profile validator** that runs an assembled `Bundle` against a NRCeS profile.
- **Canonical JSON serialiser** (RFC 8785 / JCS) for byte-exact storage and signing.
- **Identifier system URI constants** (ABHA Number, ABHA Address, MRN).

## Discipline

- **No I/O.** No database calls, no HTTP, no file reads beyond bundled profile assets.
- **No mutation.** Builders return new objects; inputs are not modified.
- **Polyglot mirror.** Every public symbol must have a matching equivalent in `@hims/py-sdk-fhir` so a Python clinical module can ship the same resource shape.
- **Pinned profile versions.** The `NRCeS_PROFILES` registry is the single source of truth for what version of each profile the platform validates against. Upgrading is one PR here.

## Export map

| Subpath | Contents |
|---|---|
| `@hims/ts-sdk-fhir` | Top-level barrel (re-exports everything) |
| `@hims/ts-sdk-fhir/types` | FHIR R4 resource types (Patient, Encounter, MedicationRequest, ...) |
| `@hims/ts-sdk-fhir/profile-registry` | `NRCeS_PROFILES` constant: profile name → canonical URL + version |
| `@hims/ts-sdk-fhir/builders` | Resource and Bundle/Composition builders |
| `@hims/ts-sdk-fhir/validators` | Profile validator |
| `@hims/ts-sdk-fhir/canonical-json` | RFC 8785 JCS serialiser |
| `@hims/ts-sdk-fhir/identifiers` | System URI constants |

## Consumers

- `modules/opd/`, `modules/lab/`, `modules/pharmacy/`, ... — call builders to produce resources for their own domain rows, attached to `*.finalized` event payloads.
- `modules/record-foundation/` — calls `buildComposition` + `buildDocumentBundle` + `validateAgainstProfile` to assemble and validate per-profile bundles before persistence.
- `services/web/` (frontend) — may import `types/` for typed UI representations of FHIR resources. Builders and validators are server-side only.

## Status

Runtime code covers document assembly primitives (`buildComposition`, `buildDocumentBundle`, resource builders, `serializeCanonical`, `validateAgainstProfile` structural checks). Tightening against live NRCeS packages and expanding the typed FHIR surface happens alongside clinical module work; see ADR-0023.
