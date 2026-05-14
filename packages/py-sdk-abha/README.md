# `hims_sdk_abha`

Python mirror of [`@hims/ts-sdk-abha`](../ts-sdk-abha). Implementation pending until the first Python service touches ABDM.

> See [ADR-0023 — Distributed FHIR assembly](../../docs/architecture/adr/0023-distributed-fhir-assembly.md). The polyglot SDK story applies to ABHA as well as FHIR: shipping the skeleton preserves the cross-language commitment.

## What's here today

- `src/hims_sdk_abha/types.py` — placeholder type aliases for ABHA Number / Address / KYC status.
- `src/hims_sdk_abha/constants.py` — gateway suffixes (`@sbx`, `@abdm`).

## What's missing

- ABHA Address parser (with Verhoeff checksum for the Number).
- Profile DTO (Pydantic).
- `map_profile_to_patient`, `derive_display_name`, `format_abha_address`.
- FHIR identifier helpers using `hims_sdk_fhir`.
- Pydantic validators for API boundaries.
- ABDM error code catalogue.
- FSM state-name constants (when Integration Hub gains a Python sibling consumer).

## Discipline (when implemented)

Mirror `@hims/ts-sdk-abha`. Pure code, no I/O.
