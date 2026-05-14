# `@hims/ts-sdk-abha`

ABHA domain types, validators, FHIR mapping helpers, and FSM state-name constants. Pure shared library, consumed by Integration Hub, EMPI, and the frontend.

> Status: skeleton (v0.1.0). API surface declared; bodies are TODOs.

## Purpose

ABHA (Ayushman Bharat Health Account) is the patient identity layer in ABDM. The HIMS platform produces, consumes, and validates ABHA artifacts in three places:

- **Integration Hub** — ABDM gateway calls into and out of the platform reference ABHA Numbers and ABHA Addresses.
- **EMPI** — golden patient records carry ABHA identifiers when known.
- **Frontend** — UI fields validate ABHA Address format before round-tripping to the gateway.

This package centralises the ABHA-specific types, validators, and constants those three consumers share. Everything here is **pure** — no I/O, no DB, no HTTP. Network calls to ABDM live in the Integration Hub module.

## What's inside

| Path | Purpose |
|---|---|
| `src/types/` | ABHA Number, ABHA Address, gateway-shared profile DTO, KYC status |
| `src/domain/` | Pure rules: profile→Patient mapping, display-name derivation, env-aware suffix selection |
| `src/fhir/` | Helpers that bridge ABHA → FHIR using `@hims/ts-sdk-fhir` constants |
| `src/validators/` | Zod schemas for runtime validation at API and UI boundaries |
| `src/constants/` | ABDM error codes, FSM state names (mirrored from FSM specs), gateway suffixes |

## Why this is separate from `@hims/ts-sdk-fhir`

`@hims/ts-sdk-fhir` is FHIR-and-NRCeS only. ABHA is an ABDM domain concept that *uses* FHIR identifiers but is not part of the HL7 FHIR specification itself. Keeping ABHA types in their own package:

- avoids conflating "FHIR primitives" with "ABDM-specific shapes",
- lets Integration Hub depend only on `@hims/ts-sdk-abha` without pulling in the FHIR validator path,
- mirrors the future Python sibling `@hims/py-sdk-abha`.

## FSM state names

The constants in `src/constants/fsm-states.ts` are the canonical state-name lists used by Integration Hub's FSM engine. They mirror the state diagrams in [`docs/architecture/lld/integration-platform/02-fsm-specifications.md`](../../docs/architecture/lld/integration-platform/02-fsm-specifications.md) and exist here so any consumer (telemetry, frontend status pills, audit) reads from the same source.

## Status

Skeleton. Types are real; validators, FHIR mapping, and the address parser are TODO.
