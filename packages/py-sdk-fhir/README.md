# `hims_sdk_fhir`

Python mirror of [`@hims/ts-sdk-fhir`](../ts-sdk-fhir). Implementation pending until the first Python service touches FHIR.

> See [ADR-0023 — Distributed FHIR assembly](../../docs/architecture/adr/0023-distributed-fhir-assembly.md). Per the ADR's follow-up actions, the Python SDK ships its skeleton now and the implementation lands when the first Python clinical module needs FHIR serialisation.

## Why this exists ahead of implementation

ADR-0023 commits the platform to a polyglot SDK story: every primitive in the TypeScript SDK has a Python sibling. Shipping the package skeleton (with the profile registry and identifier constants populated) preserves that commitment without forcing premature implementation.

## What's here today

- `src/hims_sdk_fhir/profile_registry.py` — the canonical NRCeS profile URLs + pinned versions, mirroring the TS `NRCeS_PROFILES` constant.
- `src/hims_sdk_fhir/identifiers.py` — system URI constants (ABHA Number, ABHA Address, MRN).

## What's missing (until first Python service touches FHIR)

- Resource type definitions (Pydantic models or `dataclass`-backed types).
- Resource builders (`build_encounter`, `build_medication_request`, `build_composition`, `build_document_bundle`, ...).
- Profile validator.
- Canonical JSON serialiser (RFC 8785).

## Discipline (when implemented)

Same as the TS SDK:

- No I/O, no DB, no HTTP.
- Pure transformation only.
- Public API surface must mirror `@hims/ts-sdk-fhir`'s exported symbols.
